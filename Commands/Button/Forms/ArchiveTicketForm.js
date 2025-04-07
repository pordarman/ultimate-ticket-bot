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
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {ButtonInteraction} int - Button
     */
    async execute(int) {
        if (process.env.FORM_ACTIVE == "0") return int.client.buttonCommands.get("archiveTicket").execute(int);

        const modal = new ModalBuilder()
            .setTitle("Bileti Arşivle")
            .setCustomId(`archiveTicket`);

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