"use strict";
const {
    Message,
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const database = require("../../../Helpers/Database.js");
const buttonCommand = require("../../Button/Actions/CallUser.js");

module.exports = {
    name: "çağır", // Komutun ismi
    id: "çağır", // Komutun ID'si
    aliases: [ // Komutun diğer çağırma isimleri
        "call",
        "kişiçağır",
        "kişi-çağır",
        "bilet-çağır",
        "bileti-çağır",
        "bileti-çağır",
        "ticket-call",
        "ticket-calling",
        "ticket-call-user",
        "ticket-call-user",
    ],
    description: "Komut kullanılan kanala bilet sahibini çağırır (Eğer bilet kanalıysa)", // Komutun açıklaması
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
        
        const ticketInfo = await database.getTicket(msg.channelId);
        if (!ticketInfo) return Util.error(msg, `Bu kanal bir ticket kanalı değil!`);

        return Util.getButtonCommand(buttonCommand.name).execute(interaction, ticketInfo.authorId, reason);
    },
};