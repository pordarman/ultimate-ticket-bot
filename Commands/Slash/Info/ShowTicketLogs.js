"use strict";
const {
    SlashCommandBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const prefixCommand = require("../../Prefix/Info/ShowTicketLogs.js");

module.exports = {
    name: prefixCommand.name, // Komutun ismi
    id: prefixCommand.id, // Komutun ID'si
    data: new SlashCommandBuilder() // Komutun verileri
        .setName(prefixCommand.name)
        .setDescription(prefixCommand.description)
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Ticket log bilgilerini gösterilecek kanal")
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName("ticket_id")
                .setDescription("Ticket ID'si")
                .setRequired(false)
        ),

   /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {ChatInputCommandInteraction} int - Slash komut etkileşimi
     */
    async execute(int) {
        const channel = int.options.getChannel("channel");
        const ticketId = int.options.getInteger("ticket_id");
        const channelOrTicketId = channel ? channel.id : ticketId;

        const message = Util.interactionToMessage(int, {
            content: channelOrTicketId,
            mentions: {
                channel
            }
        });

        return Util.getPrefixCommandWithId(this.id).execute(message, [channelOrTicketId]);
    },
};