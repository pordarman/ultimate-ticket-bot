"use strict";
const {
    ButtonInteraction,
    PermissionsBitField,
    MessageFlags
} = require("discord.js");
const database = require("../../../Helpers/Database");
const Util = require("../../../Helpers/Util");

module.exports = {
    name: "callUser",

   /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {ModalSubmitInteraction} int - Modal
     * @param {String} ticketAuthorId - Ticket sahibi ID'si
     * @param {String} reason - Eğer bu komut prefix kullanarak çağırılmışsa sebebi mesajdan alacağız aksi halde formlardan alacağız
     */
    async execute(int, ticketAuthorId, reason) {

        // Eğer kişi yönetici değilse
        if (!Util.isModerator(int.member)) return Util.error(int, "Bu işlemi yapabilmek için yeterli yetkiniz yok!");

        // Kullanıcıyı kontrol et
        const member = int.guild.members.cache.get(ticketAuthorId);

        // Eğer kullanıcı yoksa
        if (!member) return Util.error(int, "Bu kullanıcı sunucudan çıkmış durumda!");

        // Eğer kişi zaten kanalı görüyorsa 
        if (int.channel.permissionsFor(member).has(PermissionsBitField.Flags.ViewChannel)) return Util.error(int, "Bu kullanıcı zaten kanalı görebiliyor!")

        const NOW = Date.now();

        // Kullanıcının ticketini kontrol et
        const userTicketInfo = await database.getUser(ticketAuthorId);

        const setObject = {};
        const unsetObject = {};

        // Eğer kullanıcının aktif başka bir ticketi varsa o kanala yönlendir
        if (userTicketInfo.currentTicket !== null) {
            const channel = int.guild.channels.cache.get(userTicketInfo.currentTicket.channelId);
            if (channel) {
                channel.send({
                    content: `<@${ticketAuthorId}> bekleniyorsunuz...`,
                    allowedMentions: {
                        users: [ticketAuthorId],
                        roles: []
                    }
                });
                member.send(
                    `**• ${int.guild.name} sunucusunda <#${channel.id}> kanalına <@${int.user.id}> tarafından çağrıldınız!**`,
                );

                return int.channel.send(`**• <@${ticketAuthorId}> adlı kişinin <#${channel.id}> adlı kanalda aktif bir ticketi olduğu için onu yönlendirdim!**`);
            } else {
                // Eğer kanal yoksa ticketi sil
                userTicketInfo.currentTicket = setObject.currentTicket = null;
            }
        }

        const ticketInfo = await database.getTicket(int.channelId);

        const formatTicketId = Util.formatTicketId(ticketInfo.ticketId);
        const ticketUrgentEmoji = Util.ticketUrgentEmoji(ticketInfo.urgency);

        // Kanalı güncelle
        try {
            await int.channel.edit(
                Util.createChannelEditOptions(int.channel, {
                    name: `${ticketUrgentEmoji}ticket-${formatTicketId}`,
                    parent: process.env.OPENED_TICKET_CATEGORY_ID || null,
                    topic: `Bilet sahibi: ${member.user.tag}`,
                    permissionOverwrites: [
                        {
                            id: ticketAuthorId,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.AttachFiles
                            ]
                        },
                        {
                            id: int.guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel]
                        }
                    ]
                })
            );
        } catch (error) {
            Util.console.error(error);
            return Util.error(int, "Kanal güncellenirken bir hata oluştu! Lütfen daha sonra tekrar deneyin");
        }

        // Kullanıcıyı çağır
        int.channel.send(`<@${ticketAuthorId}> bekleniyorsunuz...`);
        member.send(
            `**• ${int.guild.name} sunucusunda <#${int.channel.id}> kanalına <@${int.user.id}> tarafından çağrıldınız!**`,
        ).catch(() => null);

        if (userTicketInfo.closedTicket !== null) {
            userTicketInfo.closedTicket = setObject.closedTicket = null;
        }

        // Eğer ticket arşivlenmişse oradan sil ve şu anki ticket verisine ekle
        if (userTicketInfo.archivedTickets[ticketInfo.ticketId]) {
            delete userTicketInfo.archivedTickets[ticketInfo.ticketId];
            unsetObject[`archivedTickets.${ticketInfo.ticketId}`] = "";
        }

        userTicketInfo.currentTicket = setObject.currentTicket = {
            channelId: int.channel.id,
            ticketId: ticketInfo.ticketId,
            createdTimestamp: NOW
        };

        ticketInfo.status = "opened";
        ticketInfo.reopenedTimestamp = NOW;
        ticketInfo.lastUpdatedTimestamp = NOW;
        delete ticketInfo.closedTimestamp;
        delete ticketInfo.archivedTimestamp;

        const callUserReason = (
            Util.isMessage(int) ? 
            reason : 
            (process.env.FORM_ACTIVE == "1" && int.fields.getTextInputValue("callUserReason"))
        ) || Util.reasons.call;

        // Databaseye kaydet
        await Promise.all([
            database.updateUser(ticketAuthorId, {
                $set: setObject,
                $unset: unsetObject
            }),
            database.updateTicket(int.channelId, {
                $set: {
                    status: ticketInfo.status,
                    reopenedTimestamp: ticketInfo.reopenedTimestamp,
                    lastUpdatedTimestamp: ticketInfo.lastUpdatedTimestamp,
                },
                $unset: {
                    closedTimestamp: "",
                    archivedTimestamp: ""
                }
            }),
            Util.sendLog({
                int,
                channelId: int.channelId,
                ticketId: ticketInfo.ticketId,
                action: "user_call",
                timestamp: NOW,
                by: int.user.id,
                reason: callUserReason,
                ticketAuthorId,
                otherInfo: {
                    ticketAuthorUserName: member.user.tag,
                }
            })
        ]);

        return int.reply({
            content: `**• <@${ticketAuthorId}> adlı kişiyi başarıyla çağırdım!**`,
            flags: MessageFlags.Ephemeral
        });
    }
}