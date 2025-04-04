"use strict";
const {
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require("discord.js");

module.exports = {
    name: "closeTicketForm",

    /**
     *  
     * @param {ButtonInteraction} int
     * @param {String} ticketAuthorId
     */
    async execute(int, ticketAuthorId) {
        if (process.env.FORM_ACTIVE == "0") return int.client.buttonCommands.get("closeTicket").execute(int, ticketAuthorId);

        const modal = new ModalBuilder()
            .setTitle("Bileti Kapat")
            .setCustomId(`closeTicket-${ticketAuthorId}`);

        const reasonText = new TextInputBuilder()
            .setLabel("Sebep")
            .setCustomId("closeTicketReason")
            .setPlaceholder("Biletin neden kapatıldığını yazınız")
            .setMinLength(1)
            .setMaxLength(1000)
            .setStyle(TextInputStyle.Paragraph);

        modal.addComponents(
            new ActionRowBuilder().addComponents(reasonText),
        );

        return int.showModal(modal);
    }
}