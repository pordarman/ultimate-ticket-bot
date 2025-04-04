"use strict";
const {
    EmbedBuilder,
    ModalSubmitInteraction
} = require("discord.js");
const database = require("../../Helpers/Database");
const Util = require("../../Helpers/Util");

module.exports = {
    name: "permanentCloseTicket",

    /**
     *  
     * @param {ModalSubmitInteraction} int
     */
    async execute(int, ticketAuthorId, reason) {
        const permanentCloseTicket = Util.isMessage(int) ?
            reason :
            (process.env.FORM_ACTIVE == "1" ? int.fields.getTextInputValue("permanentCloseTicketReason") : "Bilet kalıcı olarak kapatıldı!");

        const embed = new EmbedBuilder()
            .setDescription(`**• Ticket kanalı kalıcı olarak kapatılıyor...**`)
            .setColor("Red");
        int.reply({
            embeds: [embed],
        });

        const NOW = Date.now();
        const channelId = int.channelId;

        // Ticketi kalıcı olarak kapat ve kullanıcının bilgilerini de düzenle
        const [ticketInfo, userTicketInfo] = await Promise.all([
            database.getTicket(channelId),
            database.getUser(ticketAuthorId)
        ]);

        ticketInfo.permClosedTimestamp = NOW;
        ticketInfo.lastUpdatedTimestamp = NOW;
        ticketInfo.closedReason = permanentCloseTicket;
        ticketInfo.closedBy = int.user.id;
        ticketInfo.status = "perm_closed";

        delete ticketInfo.reopenedTimestamp;
        delete ticketInfo.closedTimestamp;

        const setObject = {};
        const unsetObject = {};

        if (userTicketInfo.currentTicket?.channelId === channelId) {
            userTicketInfo.currentTicket = setObject.currentTicket = null;
        }
        if (userTicketInfo.closedTicket?.channelId === channelId) {
            userTicketInfo.closedTicket = setObject.closedTicket = null;
        }
        if (userTicketInfo.archivedTickets[ticketInfo.ticketId]) {
            delete userTicketInfo.archivedTickets[ticketInfo.ticketId];
            unsetObject[`archivedTickets.${ticketInfo.ticketId}`] = "";
        }

        const ticketAuthor = await Util.getUser(int.client, ticketAuthorId);


        await Promise.all([
            database.updateTicket(channelId, {
                $set: {
                    status: "perm_closed",
                    closedReason: permanentCloseTicket,
                    closedBy: int.user.id,
                    permClosedTimestamp: NOW,
                    lastUpdatedTimestamp: NOW
                },
                $unset: {
                    reopenedTimestamp: "",
                    closedTimestamp: ""
                }
            }),
            database.updateUser(ticketAuthorId, {
                $set: setObject,
                $unset: unsetObject,
            }),
            Util.sendLog({
                int,
                channelId,
                ticketId: ticketInfo.ticketId,
                action: "ticket_permclosed",
                timestamp: NOW,
                by: int.user.id,
                reason: permanentCloseTicket,
                ticketAuthorId,
                otherInfo: {
                    ticketAuthorUserName: ticketAuthor.tag,
                }
            })
        ]);

        // Kanalı 5 saniye bekletip sil
        setTimeout(() => {
            int.channel.delete();
        }, 5000);
    }
}