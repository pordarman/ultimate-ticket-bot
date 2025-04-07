"use strict";
const {
    Message,
    PermissionFlagsBits,
} = require("discord.js");
const Util = require("../../../Helpers/Util");
const database = require("../../../Helpers/Database");

module.exports = {
    name: "çıkar", // Komutun ismi
    id: "çıkar", // Komutun ID'si
    aliases: [ // Komutun diğer çağırma isimleri
        "kullanıcı-çıkar",
        "remove",
        "removeuser",
        "remove-user",
        "kullanıcıçıkar",
        "kullanıcıçıkar",
    ],
    description: "Ekli ticket kanalından bir kullanıcıyı çıkarır", // Komutun açıklaması
    isAdmin: true,

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg
     * @param {String[]} args
     */
    async execute(msg, args) {

        // İlk önce kanalın bilet kanalı olup olmadığını kontrol et
        const ticketInfo = await database.getTicket(msg.channelId);

        if (!ticketInfo) return Util.error(msg, `Bu kanal bir ticket kanalı değil!`);
        if (ticketInfo.status !== "opened") return Util.error(msg, `Bu ticket kanalı kapalı!`);

        // Kişiyi çek
        const member = msg.mentions.members.first() || msg.guild.members.cache.get(args[0]);
        if (!member) return Util.error(msg, `Kullanıcı bulunamadı!`);

        if (member.user.bot) return Util.error(msg, `Botları çıkaramazsınız!`);
        if (member.id == msg.author.id) return Util.error(msg, `Kendinizi çıkaramazsınız!`);

        // Eğer kişi zaten kanalı görüyorsa
        if (!msg.channel.permissionsFor(member).has(PermissionFlagsBits.ViewChannel)) return Util.error(msg, `Bu kullanıcı zaten kanalı göremiyor!`);

        // Kanaldan çıkar
        try {
            await msg.channel.permissionOverwrites.edit(member, {
                ViewChannel: null,
                SendMessages: null,
                AttachFiles: null,
            });
        } catch (error) {
            Util.console.error(error);
            return Util.error(int, "Kullanıcıyı kanaldan çıkarırken bir hata oluştu! Lütfen daha sonra tekrar deneyin");
        }

        msg.channel.send({
            content: `<@${member.id}> ticket kanalından çıkarıldı!`,
            allowedMentions: {
                users: [member.id],
                roles: [],
            },
        });

    },
};