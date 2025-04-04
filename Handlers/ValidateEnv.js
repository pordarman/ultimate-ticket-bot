"use strict";
const requiredEnvVariables = [
    "DISCORD_TOKEN",
    "PREFIX",
    "FORM_ACTIVE",
    "MONGO_URI",
    "TICKET_DIGIT_COUNT",
    "GUILD_ID",
    "OWNER_IDS",
    "MOD_ROLE_IDS"
];

module.exports = function validateEnv() {
    const missing = [];

    for (const key of requiredEnvVariables) {
        if (!process.env[key] || process.env[key].trim() === "") {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        console.error("\n🚨 .env dosyasında eksik değişkenler bulundu:");
        for (const key of missing) {
            console.error(`- ${key}`);
        }
        console.error("\nLütfen .env dosyanı kontrol et ve eksik değerleri tamamla.\n");
        process.exit(1); // Uygulama başlatılmasın
    }
};
