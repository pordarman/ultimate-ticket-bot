"use strict";
const {
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require("discord.js");
const database = require("../../../Helpers/Database.js");
const Util = require("../../../Helpers/Util.js");

module.exports = {
    name: "createTicketForm",

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {ButtonInteraction} int - Button
     */
    async execute(int) {

        // Eğer kişi yasaklı kullanıcılar arasındaysa hata ver
        const isBlacklisted = await database.isBlacklisted(int.user.id);
        if (isBlacklisted) return Util.error(int, "Bilet açma yetkiniz olmadığı için bu işlemi gerçekleştiremiyorum! Eğer bu hatayı yanlışlıkla alıyorsanız lütfen sunucu yöneticinizle iletişime geçin.");

        // Önce modal aç ve kullanıcaıya şu soruları sor:
        // 1. Kategoriyi seçsin (Genel Destek, Öneri, Şikayet, Diğer)
        // 2. Sorunun ne olduğunu yazsın
        // 3. Biletin aciliyetini seçsin (Düşük, Orta, Yüksek, Çok Yüksek)

        const modal = new ModalBuilder()
            .setTitle("Bilet oluştur")
            .setCustomId("createTicket");

        const categoryText = new TextInputBuilder()
            .setLabel("Kategori")
            .setCustomId("ticketCategory")
            .setPlaceholder("Kategori seç (Genel, Öneri, Şikayet, Diğer)")
            .setMinLength(3)
            .setMaxLength(30)
            .setStyle(TextInputStyle.Short);

        const reasonText = new TextInputBuilder()
            .setLabel("Sorununuz")
            .setCustomId("ticketReason")
            .setPlaceholder("Sorununuzu buraya yazınız")
            .setMinLength(10)
            .setMaxLength(1000)
            .setStyle(TextInputStyle.Paragraph);

        const urgentText = new TextInputBuilder()
            .setLabel("Aciliyet (1-5)")
            .setCustomId("ticketUrgency")
            .setPlaceholder("Aciliyet seç")
            .setMinLength(1)
            .setMaxLength(1)
            .setStyle(TextInputStyle.Short);

        modal.addComponents(
            new ActionRowBuilder().addComponents(categoryText),
            new ActionRowBuilder().addComponents(reasonText),
            new ActionRowBuilder().addComponents(urgentText),
        );

        return int.showModal(modal);
    }
}