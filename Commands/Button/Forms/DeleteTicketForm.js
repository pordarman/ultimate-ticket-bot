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
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {ButtonInteraction} int - Button
     */
    async execute(int) {
        if (process.env.FORM_ACTIVE == "0") return int.client.buttonCommands.get("permanentCloseTicket").execute(int);

        const modal = new ModalBuilder()
            .setTitle("Bileti Kalıcı Olarak Kapat")
            .setCustomId(`permanentCloseTicket`);

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