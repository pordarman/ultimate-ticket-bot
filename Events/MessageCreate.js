"use strict";
const {
    Message,
    Events,
    PermissionFlagsBits
} = require("discord.js");
const database = require("../Helpers/Database");
const Util = require("../Helpers/Util");

module.exports = {
    name: Events.MessageCreate,
    /**
     *
     * @param {Message} msg
     */
    async execute(msg) {

        // Eğer mesaj bir ticket kanalında atılmışsa ticket kanalının mesaj sayısını arttır (Eğer ticket kanalı değilse bir şey yapmaz)
        await database.updateTicketMessageCountIfExist(msg.channelId);

        const prefix = process.env.PREFIX || "!"; // Varsayılan prefix

        // Eğer mesaj bir komut değilse veya bot mesajıysa görmezden gel
        if (msg.author.bot || !msg.content.startsWith(prefix)) return;

        const args = msg.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = Util.getPrefixCommand(commandName);
        if (!command) return;

        if (command.isOwner) {
            const owners = process.env.OWNER_IDS?.split(",")?.map(owner => owner.trim()) || [];
            if (!owners.includes(msg.author.id)) {
                Util.error(msg, "Bu komutu kullanmak için yetkiniz yok!");
                return;
            }
        }

        // Eğer komutun çalışması için gerekli rolleri veya yetkisi yoksa
        if (command.isAdmin && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const memberRoles = new Set(Array.isArray(msg.member.roles) ? msg.member.roles : msg.member.roles.cache.map(role => role.id));
            const requiredRoles = process.env.ADMIN_ROLES?.split(",")?.map(role => role.trim()) || [];

            const hasRequiredRole = requiredRoles.some(role => memberRoles.has(role));
            if (!hasRequiredRole) Util.error(msg, "Bu işlemi yapamazsın!");
        }

        // Eğer botta "Kanalı Yönet" yetkisi yoksa
        if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) Util.error(msg, `Botun "Kanalı Yönet" yetkisi yok!`);

        try {
            Util.console.log(`Kullanıcı: ${msg.author.tag} | Komut: ${commandName} | Argümanlar: ${args.join(" ") || "*Hiçbir argüman yok*"} | Kanal: ${msg.channel.name}`);
            await command.execute(msg, args);
        } catch (error) {
            msg.reply("Komut çalıştırılırken bir hata oluştu! Hata bilgileri konsolda gösterilecektir");
            Util.console.error(error.stack);
        }
    },
};
