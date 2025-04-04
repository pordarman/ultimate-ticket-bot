"use strict";
const {
    Message,
    PermissionFlagsBits,
} = require("discord.js");
const loadCommands = require("../../Handlers/LoadCommands.js");
const loadEvents = require("../../Handlers/LoadEvents.js");
const path = require("path");

module.exports = {
    name: "reload", // Komutun ismi
    id: "reload", // Komutun ID'si
    aliases: [ // Komutun diğer çağırma isimleri
        "reload",
        "yenile",
        "yenileme",
        "komut-yenile",
        "komutreload",
        "komut-reload",
        "komutları-yenile",
        "komutlarıyenile",
        "r"
    ],
    description: "Komutları yeniden yükler. (Sadece bot sahibi tarafından kullanılabilir)", // Komutun açıklaması
    isOwner: true, // Komutun sadece bot sahibi tarafından kullanılabilir olduğunu belirtir.

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg
     */
    async execute(msg) {

        const mainPath = __dirname.split(`${path.sep}Commands${path.sep}`)[0];

        msg.client.removeAllListeners();

        const errorResult = [
            ...loadCommands(null, mainPath, false),
            ...loadEvents(msg.client, mainPath, false),
        ];

        return msg.reply({
            content: errorResult.length > 0 ?
                (
                    `• Bazı komutlar yüklenirken bir hata oluştu! Lütfen konsolda hata mesajını kontrol edin!\n\n` +
                    `• Hata oluşan komutlar:\n` +
                    errorResult.map(line => `- ${line.replace(/^\S+/, (word) => `**${word}**`)}`).join("\n")
                ) : `• Tüm komutlar başarıyla yüklendi!`,
        });

    },
};