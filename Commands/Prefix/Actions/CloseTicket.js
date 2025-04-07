"use strict";
const {
    Message,
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const buttonCommand = require("../../Button/Actions/CloseTicket.js")

module.exports = {
    name: "kapat", // Komutun ismi
    id: "kapat", // Komutun ID'si
    aliases: [ // Komutun diğer çağırma isimleri
        "close",
        "bilet-kapat",
        "bileti-kapat",
        "bileti-kapalı",
        "ticket-close",
        "ticket-closed",
    ],
    description: "Komut kullanılan kanalı kapatır (Eğer bilet kanalıysa)", // Komutun açıklaması
    isAdmin: true,

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg
     * @param {String[]} args
     */
    async execute(msg, args) {
        const reason = args.join(" ") || Util.reasons.archived;
        const interaction = Util.messageToButtonInteraction(msg);

        return Util.getButtonCommand(buttonCommand.name).execute(interaction, reason);
    },
};