"use strict";
const {
    Message,
} = require("discord.js");
const Util = require("../../../Helpers/Util");
const database = require("../../../Helpers/Database");
const createMessageArrows = require("../../../Helpers/CreateMessageArrows");

module.exports = {
    name: "closetickets", // Komutun ismi
    id: "closetickets", // Komutun ID'si
    aliases: [ // Komutun diğer çağırma isimleri
        "close-tickets",
        "closetickets",
        "closed-tickets",
        "closedtickets",
        "kapalıbiletler",
        "kapalıbilet",
        "kapalı-biletler",
        "kapalı-bilet",
    ],
    description: "Kapalı ticket kanallarını gösterir", // Komutun açıklaması
    isAdmin: true,

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj objesi
     * @param {String[]} args - Komutun argümanları
     */
    async execute(msg, args) {

        // Bütün kapalı bilet kanallarını çek
        const ticketChannels = await database.getTicketsByFilter({
            status: "closed"
        });

        if (!ticketChannels || ticketChannels.length === 0) return Util.error(msg, `Kapalı bilet kanalı bulunamadı!`);

        ticketChannels.sort((first, second) => {
            return second.urgency - first.urgency || first.closedTimestamp - second.closedTimestamp;
        });

        const guildIcon = msg.guild.iconURL({ extension: "png", forceStatic: true, size: 1024 });

        // Eğer ticket log dizisinin uzunluğu 0 değilse sayfalar şeklinde gösterilecek
        return createMessageArrows({
            msg,
            array: ticketChannels,
            async arrayValuesFunc({
                result: {
                    channelId,
                    authorId,
                    closedTimestamp,
                    closedReason,
                    category,
                    urgency,
                    ticketId,
                    lastUpdatedTimestamp,
                    messageCount
                },
                index
            }) {
                const object = {
                    name: `Ticket ID: ${ticketId}`,
                    value: `• **Ticket sahibi:** <@${authorId}> - ${authorId}\n` +
                        `• **Ticket kanalı:** <#${channelId}> - ${channelId}\n` +
                        `• **Kapatılma tarihi:** <t:${Math.floor((closedTimestamp) / 1000)}:R>\n` +
                        `• **Kapatılma sebebi:** ${closedReason}\n` +
                        `• **Ticket kategorisi:** ${category}\n` +
                        `• **Ticket önceliği:** ${Util.ticketUrgentEmoji(urgency)} ${urgency}\n` +
                        `• **Son güncellenme tarihi:** <t:${Math.floor(lastUpdatedTimestamp / 1000)}:R>\n` +
                        `• **Mesaj sayısı:** ${messageCount.toLocaleString("tr")}`,
                    inline: true,
                };

                return index % 2 == 0 ? object : [
                    object,
                    {
                        name: "\u200b",
                        value: "\u200b",
                        inline: true,
                    }
                ]
            },
            embed: {
                author: {
                    name: msg.guild.name,
                    iconURL: guildIcon
                },
                description: `• Sunucuda şu anda kapalı olan toplamda **${ticketChannels.length}** ticket kanalı var!`,
            },
            arrowLength: "long",
            forwardAndBackwardCount: 5,
            putDescriptionOrField: "field",
            VALUES_PER_PAGE: 4,
            pageJoin: "\n\n",
            arrowTimeout: 1000 * 60 * 10, // 10 dakika
        })
    },
};