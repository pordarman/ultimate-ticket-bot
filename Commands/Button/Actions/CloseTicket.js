"use strict";
const {
    EmbedBuilder,
    ModalSubmitInteraction,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const database = require("../../../Helpers/Database");
const Util = require("../../../Helpers/Util");

module.exports = {
    name: "closeTicket",

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {ModalSubmitInteraction} int - Modal
     * @param {String} reason - Eğer bu komut prefix kullanarak çağırılmışsa sebebi mesajdan alacağız aksi halde formlardan alacağız
     */
    async execute(int, reason) {
        const ticketInfo = await database.getTicket(int.channelId);

        // Eğer ticket yoksa
        if (!ticketInfo) return Util.error(int, "Bu kanala ait ticket bilgisi bulunamadı!");

        // Eğer kişi bilet sahibi değilse veya yetkili değilse
        if (ticketInfo.authorId !== int.user.id && !Util.isModerator(int.member)) return Util.error(int, "Bu bilet kanalının sahibi siz değilsiniz veya yeterli yetkiniz yok!");

        // Eğer ticketin status değeri "closed" ise
        if (ticketInfo.status == "closed") return Util.error(int, "Bu ticket zaten kapatılmış!")

        // Eğer ticketin status değeri "archived" ise
        if (ticketInfo.status == "archived") return Util.error(int, "Bu ticket arşivlenmiş, bu yüzden kapatılamaz!")

        const NOW = Date.now();

        const user = int.client.users.cache.get(ticketInfo.authorId) || await int.client.users.fetch(ticketInfo.authorId);

        const formatTicketId = Util.formatTicketId(ticketInfo.ticketId);
        const ticketUrgentEmoji = Util.ticketUrgentEmoji(ticketInfo.urgency);

        // Kanal'ı güncelle
        try {
            await int.channel.edit(
                Util.createChannelEditOptions(int.channel, {
                    name: `${ticketUrgentEmoji}closed-${formatTicketId}`,
                    parent: process.env.CLOSED_TICKET_CATEGORY_ID || null,
                    topic: `Bilet sahibi: ${user.tag} - (Bilet kapalı)`,
                    permissionOverwrites: [
                        {
                            id: ticketInfo.authorId,
                            deny: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.AttachFiles
                            ]
                        },
                        {
                            id: int.guild.id,
                            deny: [
                                PermissionsBitField.Flags.ViewChannel
                            ]
                        }
                    ]
                })
            );
        } catch (error) {
            Util.console.error(error);
            return Util.error(int, "Bilet kapatılırken bir hata oluştu! Lütfen daha sonra tekrar deneyin!");
        }

        const closeTicketReason = (
            Util.isMessage(int) ? 
            reason : 
            (process.env.FORM_ACTIVE == "1" && int.fields.getTextInputValue("closeTicketReason"))
        ) || Util.reasons.closed;

        ticketInfo.status = "closed";
        ticketInfo.closedReason = closeTicketReason;
        ticketInfo.closedBy = int.user.id;
        ticketInfo.closedTimestamp = NOW;
        ticketInfo.lastUpdatedTimestamp = NOW;

        const userTicketInfo = await database.getUser(ticketInfo.authorId);

        const createdTimestampInSecond = Math.floor(userTicketInfo.currentTicket?.createdTimestamp / 1000);

        userTicketInfo.currentTicket = null;
        userTicketInfo.closedTicket = {
            channelId: int.channelId,
            closedTimestamp: NOW,
            ticketId: ticketInfo.ticketId,
        };
        userTicketInfo.ticketCounts.closed += 1;

        await Promise.all([
            database.updateTicket(int.channelId, {
                $set: {
                    status: "closed",
                    closedReason: closeTicketReason,
                    closedBy: int.user.id,
                    closedTimestamp: NOW,
                    lastUpdatedTimestamp: NOW
                }
            }),
            database.updateUser(ticketInfo.authorId, {
                $set: {
                    currentTicket: null,
                    closedTicket: {
                        channelId: int.channelId,
                        closedTimestamp: NOW,
                        ticketId: ticketInfo.ticketId,
                    },
                    ticketCounts: {
                        closed: userTicketInfo.ticketCounts.closed + 1
                    }
                }
            }),
            Util.sendLog({
                int,
                channelId: int.channelId,
                ticketId: ticketInfo.ticketId,
                action: "ticket_closed",
                timestamp: NOW,
                by: int.user.id,
                reason: closeTicketReason,
                ticketAuthorId: ticketInfo.authorId,
                otherInfo: {
                    ticketAuthorUserName: user.tag
                }
            })
        ]);

        // Ticket kanalına yetkililer için mesaj gönder
        const memberOrUser = int.guild.members.cache.get(ticketInfo.authorId) || await int.client.users.fetch(ticketInfo.authorId);
        const avatar = memberOrUser.displayAvatarURL({ extension: "png", forceStatic: true, size: 1024 });

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Kişiyi çağır")
                    .setEmoji("👤")
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId(`callUserForm-${ticketInfo.authorId}`),

                new ButtonBuilder()
                    .setLabel("Arşivle")
                    .setEmoji("📁")
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId(`archiveTicketForm`),

                new ButtonBuilder()
                    .setLabel("Kalıcı olarak kapat")
                    .setEmoji("🔒")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(`permanentCloseTicketForm`)
            );

        const embed = new EmbedBuilder()
            .setAuthor({
                name: memberOrUser.tag || memberOrUser.user.tag,
                iconURL: avatar
            })
            .setDescription(
                `**• Kapatılan biletin bilgileri!\n` +
                `👤 Bilet sahibi:** <@${ticketInfo.authorId}> - (${ticketInfo.authorId})\n` +
                `**📅 Açtığı tarih:** <t:${createdTimestampInSecond}:F> - <t:${createdTimestampInSecond}:R>\n` +
                `**📪 Kapatan kişi:** <@${int.user.id}> - (${int.user.id})`
            )
            .setThumbnail(avatar)
            .setColor("Blue")
            .setTimestamp();

        return int.channel.send({
            embeds: [
                embed
            ],
            components: [
                actionRow
            ]
        })

    }
}