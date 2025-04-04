"use strict";
const {
    ModalSubmitInteraction,
    PermissionsBitField} = require("discord.js");
const database = require("../../Helpers/Database");
const Util = require("../../Helpers/Util");

module.exports = {
    name: "archiveTicket",

    /**
     *  
     * @param {ModalSubmitInteraction} int
     */
    async execute(int, ticketAuthorId, reason) {
        const archiveTicketReason = Util.isMessage(int) ?
            reason :
            (process.env.FORM_ACTIVE == "1" ? int.fields.getTextInputValue("archiveTicketReason") : "Bilet arşivlendi!");

        // Ticket bilgilerini al
        const ticketInfo = await database.getTicket(int.channelId);
        if (!ticketInfo) return Util.error(int, "Ticket bulunamadı!");

        // Eğer ticket kanalı opened durumundaysa hata ver
        if (ticketInfo.status == "opened") return Util.error(int, "Ticket kanalı açık durumda! Arşivlemek için ticketi kapatmalısınız!");

        // Eğer ticket zaten arşivlenmişse
        if (ticketInfo.status == "archived") return Util.error(int, "Bu ticket zaten arşivlenmiş!");

        const NOW = Date.now();

        ticketInfo.status = "archived";
        ticketInfo.archivedTimestamp = NOW;

        const setObject = {};

        const userTicketInfo = await database.getUser(ticketAuthorId);

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

        const user = int.client.users.cache.get(ticketAuthorId) || await int.client.users.fetch(ticketAuthorId);

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
            return Util.error(int, "Ticket arşivlenirken bir hata oluştu! Lütfen daha sonra tekrar deneyin!");
        }

        await Promise.all([
            database.updateTicket(int.channelId, {
                $set: {
                    status: ticketInfo.status,
                    archivedTimestamp: ticketInfo.archivedTimestamp,
                }
            }),
            database.updateUser(ticketAuthorId, {
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
                ticketAuthorId,
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