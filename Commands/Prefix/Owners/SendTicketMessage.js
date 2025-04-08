"use strict";
const {
    Message
} = require("discord.js");
const Util = require("../../../Helpers/Util");

module.exports = {
    name: "button", // Komutun ismi
    id: "button", // Komutun ID'si
    aliases: [ // Komutun diğer çağırma isimleri
        "buton",
        "send",
        "gönder",
    ],
    description: "Ticket mesajını gönderir", // Komutun açıklaması

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj objesi
     * @param {String[]} args - Komutun argümanları
     */
    async execute(msg, args) {

        // Eğer kişide yönetici yetkisi yoksa hata ver
        if (!msg.member.permissions.has("Administrator")) return Util.error(msg, `Bu komutu kullanabilmek için \`Yönetici\` yetkisine sahip olmalısınız`);

        return Util.sendTicketMessage(msg.channel);
    },
};