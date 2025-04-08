"use strict";
const {
    SlashCommandBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const prefixCommand = require("../../Prefix/Actions/AddUserToTicket.js");

module.exports = {
    name: prefixCommand.name, // Komutun ismi
    id: prefixCommand.id, // Komutun ID'si
    data: new SlashCommandBuilder() // Komutun verileri
        .setName(prefixCommand.name)
        .setDescription(prefixCommand.description)
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Ticket'a eklemek istediğiniz kullanıcı")
                .setRequired(true)
        ),

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {ChatInputCommandInteraction} int - Slash komut etkileşimi
     */
    async execute(int) {
        const user = int.options.getUser("user", true);

        const message = Util.interactionToMessage(int, {
            content: user.id,
            mentions: {
                user
            }
        });

        return Util.getPrefixCommandWithId(this.id).execute(message, [user.id]);
    },
};