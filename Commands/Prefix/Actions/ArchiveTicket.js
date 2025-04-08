"use strict";
const {
    Message,
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const buttonCommand = require("../../Button/Actions/ArchiveTicket.js")

module.exports = {
    name: "arşivle", // Komutun ismi
    id: "arşivle", // Komutun ID'si
    aliases: [ // Komutun diğer çağırma isimleri
        "arşiv",
        "bilet-arşivle",
        "bilet-arşiv",
        "bileti-arşivle",
        "biletiarşivle",
        "biletiarşiv",
        "ticket-archive",
        "archive",
        "ticket-archived",
    ],
    description: "Komut kullanılan kanalı arşivler (Eğer bilet kanalıysa)", // Komutun açıklaması
    isAdmin: true, // Komutun sadece yönetici tarafından kullanılabilir olduğunu belirtir
    isOwner: false, // Komutun sadece bot sahibi tarafından kullanılabilir olduğunu belirtir

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj objesi
     * @param {String[]} args - Komutun argümanları
     */
    async execute(msg, args) {
        const reason = args.join(" ") || Util.reasons.archived;
        const interaction = Util.messageToButtonInteraction(msg);

        return Util.getButtonCommand(buttonCommand.name).execute(interaction, reason);
    },
};