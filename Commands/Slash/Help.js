"use strict";
const {
    SlashCommandBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const Util = require("../../Helpers/Util.js");
const prefixCommand = require("../Prefix/Help.js");

module.exports = {
    name: prefixCommand.name, // Komutun ismi
    id: prefixCommand.id, // Komutun ID'si
    data: new SlashCommandBuilder() // Komutun verileri
        .setName(prefixCommand.name)
        .setDescription(prefixCommand.description),

    /**
     * 
     * @param {ChatInputCommandInteraction} int
     */
    async execute(int) {
        const message = Util.interactionToMessage(int);

        return Util.getPrefixCommandWithId(this.id).execute(message);
    },
};