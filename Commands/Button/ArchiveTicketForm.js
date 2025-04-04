"use strict";
const {
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require("discord.js");

module.exports = {
    name: "archiveTicketForm",
    isAdmin: true,

    /**
     *  
     * @param {ButtonInteraction} int
     * @param {String} ticketAuthorId
     */
    async execute(int, ticketAuthorId) {
        if (process.env.FORM_ACTIVE == "0") return int.client.buttonCommands.get("archiveTicket").execute(int, ticketAuthorId);

        const modal = new ModalBuilder()
            .setTitle("Bileti Arşivle")
            .setCustomId(`archiveTicket-${ticketAuthorId}`);

        const reasonText = new TextInputBuilder()
            .setLabel("Sebep")
            .setCustomId("archiveTicketReason")
            .setPlaceholder("Biletin neden arşivlendiğini yazınız")
            .setMinLength(1)
            .setMaxLength(1000)
            .setStyle(TextInputStyle.Paragraph);

        modal.addComponents(
            new ActionRowBuilder().addComponents(reasonText),
        );

        return int.showModal(modal);
    }
}