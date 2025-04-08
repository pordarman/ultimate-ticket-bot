"use strict";
const {
    Message,
} = require("discord.js");
const Util = require("../../../Helpers/Util");
const createMessageArrows = require("../../../Helpers/CreateMessageArrows");
const database = require("../../../Helpers/Database");

module.exports = {
    name: "logs", // Komutun ismi
    id: "logs", // Komutun ID'si
    aliases: [ // Komutun diğer çağırma isimleri
        "logs",
        "log",
        "loglar",
        "ticketlog",
        "ticket-logs",
        "ticket-log",
        "ticket-logs",
    ],
    description: "Ticket loglarını gösterir", // Komutun açıklaması
    isAdmin: true,

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj objesi
     * @param {String[]} args - Komutun argümanları
     */
    async execute(msg, args) {

        // Önce girilen şeyin bir sayı olup olmadığını kontrol et
        // Eğer sayı girilmemişse şu anki kanal ID'sini çekeceğiz
        // Girile şey bir kanal ID'si veya ticket ID'si olabilir
        let ticketId = args[0]?.replace(/[^0-9]/g, "");
        if (!ticketId) {
            ticketId = msg.channel.id;
        }

        if (isNaN(ticketId)) return Util.error(msg, `Lütfen geçerli bir ticket veya kanal ID'si girin!`);

        const isChannelId = msg.guild.channels.cache.has(ticketId);

        // Eğer ticketId bir kanal ID'si ise ticket bilgisini al
        let ticketInfo = isChannelId ?
            await database.getTicket(ticketId) :
            await database.getTicketLog(Number(ticketId));

        // Eğer ticket yoksa
        if (!ticketInfo) return Util.error(msg, `Ticket bulunamadı!`);

        // Eğer ticket bir kanal ID'si ise ticket bilgisini al
        if (isChannelId) ticketInfo = await database.getTicketLog(ticketInfo.ticketId);

        // Eğer ticket yoksa
        if (!ticketInfo) return Util.error(msg, `Ticket bulunamadı!`);

        // Eğer bir hata olur da ticket log dizisinin uzunluğu 0 ise
        if (ticketInfo.logs.length === 0) return Util.error(msg, `Bu ticketin logları bulunamadı!`);

        const guildIcon = msg.guild.iconURL({ extension: "png", forceStatic: true, size: 1024 });

        function getTicketDescAndEmoji(action, by) {
            return {
                "ticket_opened": {
                    content: `<@${by}> tarafından açıldı!`,
                    emoji: "📩",
                },
                "ticket_reopened": {
                    content: `<@${by}> tarafından tekrar açıldı!`,
                    emoji: "🔁"
                },
                "ticket_closed": {
                    content: `<@${by}> tarafından kapatıldı!`,
                    emoji: "🔒"
                },
                "ticket_archived": {
                    content: `<@${by}> tarafından arşivlendi!`,
                    emoji: "📦"
                },
                "ticket_permclosed": {
                    content: `<@${by}> tarafından silindi!`,
                    emoji: "🗑️"
                },
                "user_call": {
                    content: `<@${by}> tarafından çağrıldı!`,
                    emoji: "📞"
                },
            }[action];
        };

        // Eğer ticket log dizisinin uzunluğu 0 değilse sayfalar şeklinde gösterilecek
        return createMessageArrows({
            msg,
            array: ticketInfo.logs,
            async arrayValuesFunc({
                result: {
                    action,
                    by,
                    reason,
                    timestamp
                },
                index,
                length
            }) {
                const ticketInfoDescAndEmoji = getTicketDescAndEmoji(action, by);

                return `${ticketInfoDescAndEmoji.emoji} \`#${length - index}\` ${ticketInfoDescAndEmoji.content} - <t:${Math.floor(timestamp / 1000)}:F>` +
                    (
                        reason?.length > 0 ? `\n**• Sebep:** ${Util.truncateString(reason, 30)}` : ""
                    );
            },
            embed: {
                author: {
                    name: msg.guild.name,
                    iconURL: guildIcon
                },
                description: `• <@${ticketInfo.authorId}> tarafından açılan ticket logları **(Ticket: ${ticketInfo.ticketId})**`,
            },
            arrowLength: "long",
            forwardAndBackwardCount: 10,
            VALUES_PER_PAGE: 8,
            pageJoin: "\n\n",
            arrowTimeout: 1000 * 60 * 10, // 10 dakika
        })
    },
};