"use strict";
const {
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require("discord.js");

module.exports = {
    name: "permanentCloseTicketForm",
    isAdmin: true,

    /**
     *  
     * @param {ButtonInteraction} int
     * @param {String} ticketAuthorId
     */
    async execute(int, ticketAuthorId) {
        if (process.env.FORM_ACTIVE == "0") return int.client.buttonCommands.get("permanentCloseTicket").execute(int, ticketAuthorId);

        const modal = new ModalBuilder()
            .setTitle("Bileti Kalıcı Olarak Kapat")
            .setCustomId(`permanentCloseTicket-${ticketAuthorId}`);

        const reasonText = new TextInputBuilder()
            .setLabel("Sebep")
            .setCustomId("permanentCloseTicketReason")
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