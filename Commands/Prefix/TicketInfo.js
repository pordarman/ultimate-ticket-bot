"use strict";
const {
    Message,
    EmbedBuilder
} = require("discord.js");
const Util = require("../../Helpers/Util");
const database = require("../../Helpers/Database");

module.exports = {
    name: "info", // Komutun ismi
    id: "info", // Komutun ID'si
    aliases: [ // Komutun diğer çağırma isimleri
        "info",
        "bilgi",
        "kanalbilgi",
        "kanal",
        "ticketinfo",
        "ticket-info",
        "ticket-infos",
    ],
    description: "Ticket bilgilerini gösterir.", // Komutun açıklaması
    isAdmin: true,

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg
     * @param {String[]} args
     */
    async execute(msg, args) {

        // Önce girilen şeyin bir sayı olup olmadığını kontrol et
        // Eğer sayı girilmemişse şu anki kanal ID'sini çekeceğiz
        // Girile şey bir kanal ID'si veya ticket ID'si olabilir
        let ticketIdArg = args[0]?.replace(/[^0-9]/g, "");
        if (!ticketIdArg) {
            ticketIdArg = msg.channel.id;
        }

        if (isNaN(ticketIdArg)) return Util.error(msg, `Lütfen geçerli bir ticket veya kanal ID'si girin!`);

        const isChannelId = msg.guild.channels.cache.has(ticketIdArg);

        // Eğer ticketId bir kanal ID'si ise ticket bilgisini al
        let ticketInfo = isChannelId ?
            await database.getTicket(ticketIdArg) :
            await database.getTicketLog(ticketIdArg);

        // Eğer ticket yoksa
        if (!ticketInfo) return Util.error(msg, `Ticket bulunamadı!`);

        // Eğer ticket bir ticket ID'si ise ticket bilgisini al
        if (!isChannelId) ticketInfo = await database.getTicket(ticketInfo.channelId);

        // Eğer ticket yoksa
        if (!ticketInfo) return Util.error(msg, `Ticket bulunamadı!`);

        const {
            channelId,
            authorId,
            createdTimestamp,
            reopenedTimestamp,
            closedTimestamp,
            permClosedTimestamp,
            archivedTimestamp,
            openedReason,
            category,
            urgency,
            ticketId,
            status,
            closedBy,
            closedReason,
            lastUpdatedTimestamp,
            messageCount
        } = ticketInfo;

        const statusToText = {
            "opened": "Açık",
            "closed": "Kapalı",
            "archived": "Arşivlenmiş",
            "perm_closed": "Kalıcı olarak kapatıldı"
        }

        const guildIcon = msg.guild.iconURL({ extension: "png", forceStatic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setAuthor({
                name: msg.guild.name,
                iconURL: guildIcon,
            })
            .setDescription(
                `**• <#${channelId}> (Ticket: ${ticketId}) kanalı hakkında bilgiler**\n` +
                `**• Son güncellenme tarihi:** <t:${Math.floor(lastUpdatedTimestamp / 1000)}:F> (<t:${Math.floor(lastUpdatedTimestamp / 1000)}:R>)\n\n` +
                `👤 **Biletin sahibi:** <@${authorId}> (${authorId})\n` +
                `📅 **Oluşturulma tarihi:** <t:${Math.floor(createdTimestamp / 1000)}:F> (<t:${Math.floor(createdTimestamp / 1000)}:R>)\n` +
                `🗂️ **Kategori:** ${category}\n` +
                `🔒 **Biletin durumu:** ${statusToText[status]}\n` +
                `🚨 **Biletin aciliyeti:** ${Util.ticketUrgentEmoji(urgency)} (${urgency})\n` +
                `📝 **Açılma nedeni:** ${Util.truncateString(openedReason, 50)}\n` +
                (
                    reopenedTimestamp ?
                        `📅 **Tekrar açılma tarihi:** <t:${Math.floor(reopenedTimestamp / 1000)}:F> (<t:${Math.floor(reopenedTimestamp / 1000)}:R>)\n` :
                        ""
                ) +
                (
                    closedTimestamp ?
                        (
                            `📅 **Kapama tarihi:** <t:${Math.floor(closedTimestamp / 1000)}:F> (<t:${Math.floor(closedTimestamp / 1000)}:R>)\n` +
                            `📝 **Kapatılma nedeni:** ${Util.truncateString(closedReason, 50)}\n` +
                            `🔒 **Kapatan kişi:** <@${closedBy}> (${closedBy})\n`
                        ) :
                        ""
                ) +
                (
                    archivedTimestamp ?
                        `📅 **Arşivleme tarihi:** <t:${Math.floor(archivedTimestamp / 1000)}:F> (<t:${Math.floor(archivedTimestamp / 1000)}:R>)\n` :
                        ""
                ) +
                (
                    permClosedTimestamp ?
                        `📅 **Kalıcı kapama tarihi:** <t:${Math.floor(permClosedTimestamp / 1000)}:F> (<t:${Math.floor(permClosedTimestamp / 1000)}:R>)\n` :
                        ""
                ) +
                `💬 **Mesaj sayısı:** ${messageCount}`
            )
            .setColor("Blue")
            .setFooter({
                text: msg.guild.name,
                iconURL: guildIcon,
            })
            .setTimestamp();

        return msg.reply({
            embeds: [embed],
        });
    },
};