"use strict";
const {
    EmbedBuilder,
    ModalSubmitInteraction
} = require("discord.js");
const database = require("../../../Helpers/Database");
const Util = require("../../../Helpers/Util");

module.exports = {
    name: "permanentCloseTicket",

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {ModalSubmitInteraction} int - Modal
     * @param {String} reason - Eğer bu komut prefix kullanarak çağırılmışsa sebebi mesajdan alacağız aksi halde formlardan alacağız
     */
    async execute(int, reason) {
        const NOW = Date.now();

        const channelId = int.channelId;

        const ticketInfo = await database.getTicket(channelId);
        if (!ticketInfo) return Util.error(int, "Bu kanala ait ticket bilgisi bulunamadı!");

        // Eğer kişi bilet sahibi değilse veya yetkili değilse
        if (ticketInfo.authorId !== int.user.id && !Util.isModerator(int.member)) return Util.error(int, "Bu bilet kanalının sahibi siz değilsiniz veya yeterli yetkiniz yok!");

        // Ticketi kalıcı olarak kapat ve kullanıcının bilgilerini de düzenle
        const userTicketInfo = await database.getUser(ticketInfo.authorId);

        const permanentCloseTicket = Util.isMessage(int) ?
            reason :
            (process.env.FORM_ACTIVE == "1" ? int.fields.getTextInputValue("permanentCloseTicketReason") : Util.reasons.permclosed);

        const embed = new EmbedBuilder()
            .setDescription(`**• Ticket kanalı kalıcı olarak kapatılıyor...**`)
            .setColor("Red");
        int.reply({
            embeds: [embed],
        });

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

        const ticketAuthor = await Util.getUser(int.client, ticketInfo.authorId);

        // Kanalı 5 saniye bekletip sil
        setTimeout(async () => {
            try {
                int.channel.delete();
            }
            catch (error) {
                Util.console.error(error);
                Util.error(int, "Ticket kanalı silinirken bir hata oluştu! Lütfen daha sonra tekrar deneyin!");
                return;
            }

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
                database.updateUser(ticketInfo.authorId, {
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
                    ticketAuthorId: ticketInfo.authorId,
                    otherInfo: {
                        ticketAuthorUserName: ticketAuthor.tag,
                    }
                })
            ]);
        }, 5000);


    }
}