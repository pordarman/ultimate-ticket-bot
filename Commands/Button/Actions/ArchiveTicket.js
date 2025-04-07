"use strict";
const {
    ModalSubmitInteraction,
    PermissionsBitField
} = require("discord.js");
const database = require("../../../Helpers/Database");
const Util = require("../../../Helpers/Util");

module.exports = {
    name: "archiveTicket",

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {ModalSubmitInteraction} int - Modal
     * @param {String} reason - Eğer bu komut prefix kullanarak çağırılmışsa sebebi mesajdan alacağız aksi halde formlardan alacağız
     */
    async execute(int, reason) {
        
        // Ticket bilgilerini al
        const ticketInfo = await database.getTicket(int.channelId);
        if (!ticketInfo) return Util.error(int, "Bu kanala ait ticket bilgisi bulunamadı!");

        // Eğer kişi bilet sahibi değilse veya yetkili değilse
        if (ticketInfo.authorId !== int.user.id && !Util.isModerator(int.member)) return Util.error(int, "Bu bilet kanalının sahibi siz değilsiniz veya yeterli yetkiniz yok!");

        // Eğer ticket kanalı opened durumundaysa hata ver
        if (ticketInfo.status == "opened") return Util.error(int, "Ticket kanalı açık durumda! Arşivlemek için ticketi kapatmalısınız!");

        // Eğer ticket zaten arşivlenmişse
        if (ticketInfo.status == "archived") return Util.error(int, "Bu ticket zaten arşivlenmiş!");

        const NOW = Date.now();

        ticketInfo.status = "archived";
        ticketInfo.archivedTimestamp = NOW;

        const setObject = {};

        const userTicketInfo = await database.getUser(ticketInfo.authorId);

        const ticketId = ticketInfo.ticketId;

        // Eğer ticket kapatılmadan arşivleniyorsa
        if (userTicketInfo.currentTicket?.channelId === int.channelId) {
            userTicketInfo.currentTicket = setObject[`currentTicket`] = null;
        }
        if (userTicketInfo.closedTicket?.channelId === int.channelId) {
            userTicketInfo.closedTicket = setObject[`closedTicket`] = null;
        }
        userTicketInfo.archivedTickets[ticketId] = setObject[`archivedTickets.${ticketId}`] = {
            archivedTimestamp: Date.now(),
            channelId: int.channelId,
        };

        const user = int.client.users.cache.get(ticketInfo.authorId) || await int.client.users.fetch(ticketInfo.authorId);

        const formatTicketId = Util.formatTicketId(ticketInfo.ticketId);
        const ticketUrgentEmoji = Util.ticketUrgentEmoji(ticketInfo.urgency);

        // Ticketi arşivle
        try {
            await int.channel.edit(
                Util.createChannelEditOptions(int.channel, {
                    name: `${ticketUrgentEmoji}archived-${formatTicketId}`,
                    parent: process.env.ARCHIVED_TICKET_CATEGORY_ID || null,
                    topic: `Bilet sahibi: ${user.tag} - (Bilet arşivlenmiş)`,
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
            return Util.error(int, "Ticket arşivlenirken bir hata oluştu! Lütfen daha sonra tekrar deneyin!");
        }

        const archiveTicketReason = Util.isMessage(int) ?
            reason :
            (process.env.FORM_ACTIVE == "1" ? int.fields.getTextInputValue("archiveTicketReason") : Util.reasons.archived);

        await Promise.all([
            database.updateTicket(int.channelId, {
                $set: {
                    status: ticketInfo.status,
                    archivedTimestamp: ticketInfo.archivedTimestamp,
                }
            }),
            database.updateUser(ticketInfo.authorId, {
                $set: setObject
            }),
            Util.sendLog({
                int,
                channelId: int.channelId,
                ticketId: ticketInfo.ticketId,
                action: "ticket_archived",
                timestamp: NOW,
                by: int.user.id,
                reason: archiveTicketReason,
                ticketAuthorId: ticketInfo.authorId,
                otherInfo: {
                    ticketAuthorUserName: user.tag,
                }
            })
        ])

        return int.reply(
            `**• <#${int.channelId}>** adlı bilet kanalı başarıyla arşivlendi!`
        );

    }
}