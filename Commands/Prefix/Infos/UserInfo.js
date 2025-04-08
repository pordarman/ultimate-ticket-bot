"use strict";
const {
    Message,
    EmbedBuilder
} = require("discord.js");
const Util = require("../../../Helpers/Util");
const database = require("../../../Helpers/Database");

module.exports = {
    name: "userinfo", // Komutun ismi
    id: "userinfo", // Komutun ID'si
    aliases: [ // Komutun diğer çağırma isimleri
        "userinfo",
        "user-info",
        "user-infos",
        "user",
        "kullanıcıbilgi",
        "kullanıcı",
        "kişibilgi",
        "kişibilgisi",
    ],
    description: "Kullanıcının ticket bilgilerini gösterir", // Komutun açıklaması
    isAdmin: true,

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj objesi
     * @param {String[]} args - Komutun argümanları
     */
    async execute(msg, args) {

        const userId = args[0]?.replace(/[^0-9]/g, "") || msg.author.id;

        if (!userId || isNaN(userId) || !/^\d{17,20}$/.test(userId)) return Util.error(msg, `Lütfen geçerli bir kişi ID'si giriniz!`);

        const userInfo = await database.getUser(userId);

        // Eğer ticket yoksa
        if (!userInfo) return Util.error(msg, "Etiketlediğiniz kişi bir kişi değil veya bu kişinin ticket bilgileri bulunamadı!");

        const {
            currentTicket,
            closedTicket,
            archivedTickets,
            ticketCounts,
            lastTicketTimestamp
        } = userInfo;

        let name;
        let icon;

        const user = await Util.getUser(msg.client, userId);

        if (user) {
            name = user.tag;
            icon = user.displayAvatarURL({ extension: "png", forceStatic: true, size: 1024 });
        }
        else {
            name = "Kullanıcı bulunamadı";
            icon = msg.guild.iconURL({ extension: "png", forceStatic: true, size: 1024 });
        }

        const embed = new EmbedBuilder()
            .setAuthor({
                name,
                iconURL: icon,
            })
            .setDescription(
                `**• <@${userId}> (${userId}) hakkında bilgiler**\n` +
                `📅 **Son ticket tarihi:** ${lastTicketTimestamp != 0 ? `<t:${Math.floor(lastTicketTimestamp / 1000)}:F> (<t:${Math.floor(lastTicketTimestamp / 1000)}:R>)` : "Herhangi bir işlem yok"}\n\n` +
                (
                    currentTicket ?
                        `📩 **Açık ticket:** <#${currentTicket.channelId}> (${currentTicket.channelId})\n` +
                        `🆔 **Ticket ID:** ${currentTicket.ticketId}\n` +
                        `📅 **Açılma tarihi:** <t:${Math.floor(currentTicket.createdTimestamp / 1000)}:F> (<t:${Math.floor(currentTicket.createdTimestamp / 1000)}:R>)\n` :
                        ""
                ) +
                (
                    closedTicket ?
                        `🔒 **Kapalı ticket:** <#${closedTicket.channelId}> (${closedTicket.channelId})\n` +
                        `🆔 **Ticket ID:** ${closedTicket.ticketId}\n` +
                        `📅 **Kapama tarihi:** <t:${Math.floor(closedTicket.closedTimestamp / 1000)}:F> (<t:${Math.floor(closedTicket.closedTimestamp / 1000)}:R>)\n` :
                        ""
                ) +
                `📦 **Arşivlenmiş ticket sayısı:** ${Object.keys(archivedTickets).length}`
            )
            .addFields(
                {
                    name: "\u200b",
                    value: "\u200b"
                },
                {
                    name: "İşlem bilgileri",
                    value: `🎫 **Ticket açma sayısı:** ${ticketCounts.opened}\n` +
                        `🔒 **Ticket kapama sayısı:** ${ticketCounts.closed}\n` +
                        `📦 **Ticket arşivleme sayısı:** ${ticketCounts.archived}\n` +
                        `📞 **Ticket kanalına çağırılma sayısı:** ${ticketCounts.calls}`
                }
            )
            .setColor("Blue")
            .setFooter({
                text: name,
                iconURL: icon,
            })
            .setTimestamp();

        return msg.reply({
            embeds: [embed],
        });
    },
};