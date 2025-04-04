"use strict";
const {
    GuildChannel,
    Events,
    ChannelType,
    AuditLogEvent
} = require("discord.js");
const database = require("../Helpers/Database");
const Util = require("../Helpers/Util");

module.exports = {
    name: Events.ChannelDelete,
    /**
     *
     * @param {GuildChannel} channel
     */
    async execute(channel) {
        // Eğer kanal bir sunucu kanalı değilse bir şey yapma
        if (!channel.guild) return;

        // Eğer kanal bir yazı kanalı değilse bir şey yapma
        if (channel.type != ChannelType.GuildText) return;

        // Eğer kanal bir ticket kanalı değilse bir şey yapma
        const ticketInfo = await database.getTicket(channel.id);
        if (!ticketInfo) return;

        const NOW = Date.now();

        const deletedBy = (await channel.guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelDelete,
            limit: 1,
        })).entries.first()?.executor || null;

        // Eğer kanal bir ticket kanalıysa ticketi sil ve ticket sahibinin bilgilerini güncelle
        ticketInfo.status = "perm_closed";
        ticketInfo.permClosedTimestamp = NOW;
        ticketInfo.lastUpdatedTimestamp = NOW;
        ticketInfo.closedReason = "Ticket kanalı silindi";
        ticketInfo.closedBy = deletedBy?.id || "Bilinmiyor";

        const userTicketInfo = await database.getUser(ticketInfo.authorId);
        const setObject = {};
        const unsetObject = {};

        if (userTicketInfo.currentTicket?.channelId === channel.id) {
            userTicketInfo.currentTicket = setObject.currentTicket = null;
        }
        if (userTicketInfo.closedTicket?.channelId === channel.id) {
            userTicketInfo.closedTicket = setObject.closedTicket = null;
        }
        if (userTicketInfo.archivedTickets[ticketInfo.ticketId]) {
            delete userTicketInfo.archivedTickets[ticketInfo.ticketId];
            unsetObject[`archivedTickets.${ticketInfo.ticketId}`] = "";
        }

        await Promise.all([
            database.updateTicket(channel.id, {
                $set: {
                    status: ticketInfo.status,
                    permClosedTimestamp: ticketInfo.permClosedTimestamp,
                    lastUpdatedTimestamp: ticketInfo.lastUpdatedTimestamp,
                    closedReason: ticketInfo.closedReason,
                    closedBy: ticketInfo.closedBy,
                },
                $unset: {
                    reopenedTimestamp: "",
                    closedTimestamp: ""
                }
            }),
            database.updateUser(ticketInfo.authorId, {
                $set: setObject,
                $unset: unsetObject,
            }),
            Util.sendLog({
                int: {
                    user: { id: deletedBy || "Bilinmiyor" },
                    client: channel.client
                },
                channelId: channel.id,
                ticketId: ticketInfo.ticketId,
                action: "channel_delete",
                timestamp: NOW,
                by: deletedBy?.id || "Bilinmiyor",
                reason: "Ticket kanalı silindi",
                ticketAuthorId: ticketInfo.authorId,
                otherInfo: {
                    deleteUser: deletedBy,
                    ticketAuthorUserName: deletedBy?.tag || "Bilinmiyor",
                }
            })
        ])
    },
};
