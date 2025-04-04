"use strict";
const {
    Message,
} = require("discord.js");
const Util = require("../../Helpers/Util");
const database = require("../../Helpers/Database");
const createMessageArrows = require("../../Helpers/CreateMessageArrows");

module.exports = {
    name: "opentickets", // Komutun ismi
    id: "opentickets", // Komutun ID'si
    aliases: [ // Komutun diğer çağırma isimleri
        "open-tickets",
        "opentickets",
        "opened-tickets",
        "openedtickets",
        "open",
        "açıkbiletler",
        "açıkbilet",
        "açık-biletler",
        "açık-bilet",
    ],
    description: "Açık ticket kanallarını gösterir.", // Komutun açıklaması
    isAdmin: true,

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg
     */
    async execute(msg) {

        // Bütün açık bilet kanallarını çek
        const ticketChannels = await database.getTicketsByFilter({
            status: "opened"
        });

        if (!ticketChannels || ticketChannels.length === 0) return Util.error(msg, `Açık bilet kanalı bulunamadı!`);

        ticketChannels.sort((first, second) => {
            return second.urgency - first.urgency || first.createdTimestamp - second.createdTimestamp;
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
                    createdTimestamp,
                    reopenedTimestamp,
                    openedReason,
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
                        `• **Açılış tarihi:** <t:${Math.floor((reopenedTimestamp || createdTimestamp) / 1000)}:R>\n` +
                        `• **Açılma sebebi:** ${openedReason}\n` +
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
                description: `• Sunucuda şu anda açık olan toplamda **${ticketChannels.length}** ticket kanalı var!`,
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