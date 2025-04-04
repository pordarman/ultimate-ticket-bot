"use strict";
const {
    EmbedBuilder,
    ModalSubmitInteraction,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");
const database = require("../../Helpers/Database");
const Util = require("../../Helpers/Util");

module.exports = {
    name: "closeTicket",

    /**
     *  
     * @param {ModalSubmitInteraction} int
     */
    async execute(int, ticketAuthorId, reason) {
        const closeTicketReason = Util.isMessage(int) ?
            reason :
            (process.env.FORM_ACTIVE == "1" ? int.fields.getTextInputValue("closeTicketReason") : "Bilet kapatıldı!");

        const ticketInfo = await database.getTicket(int.channelId);

        // Eğer ticket yoksa
        if (!ticketInfo) return Util.error(int, "Ticket bulunamadı!")

        // Eğer ticketin status değeri "closed" ise
        if (ticketInfo.status == "closed") return Util.error(int, "Bu ticket zaten kapatılmış!")

        // Eğer ticketin status değeri "archived" ise
        if (ticketInfo.status == "archived") return Util.error(int, "Bu ticket arşivlenmiş, bu yüzden kapatılamaz!")

        const NOW = Date.now();

        const user = int.client.users.cache.get(ticketAuthorId) || await int.client.users.fetch(ticketAuthorId);

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
                            id: ticketAuthorId,
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

        ticketInfo.status = "closed";
        ticketInfo.closedReason = closeTicketReason;
        ticketInfo.closedBy = int.user.id;
        ticketInfo.closedTimestamp = NOW;
        ticketInfo.lastUpdatedTimestamp = NOW;

        const userTicketInfo = await database.getUser(ticketAuthorId);

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
            database.updateUser(ticketAuthorId, {
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
                ticketAuthorId,
                otherInfo: {
                    ticketAuthorUserName: user.tag
                }
            })
        ]);

        // Ticket kanalına yetkililer için mesaj gönder
        const memberOrUser = int.guild.members.cache.get(ticketAuthorId) || await int.client.users.fetch(ticketAuthorId);
        const avatar = memberOrUser.displayAvatarURL({ extension: "png", forceStatic: true, size: 1024 });

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Kişiyi çağır")
                    .setEmoji("👤")
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId(`callUserForm-${ticketAuthorId}`),

                new ButtonBuilder()
                    .setLabel("Arşivle")
                    .setEmoji("📁")
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId(`archiveTicketForm-${ticketAuthorId}`),

                new ButtonBuilder()
                    .setLabel("Kalıcı olarak kapat")
                    .setEmoji("🔒")
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(`permanentCloseTicketForm-${ticketAuthorId}`)
            );

        const embed = new EmbedBuilder()
            .setAuthor({
                name: memberOrUser.tag || memberOrUser.user.tag,
                iconURL: avatar
            })
            .setDescription(
                `**• Kapatılan biletin bilgileri!\n` +
                `👤 Bilet sahibi:** <@${ticketAuthorId}> - (${ticketAuthorId})\n` +
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