"use strict";
const {
    Message
} = require("discord.js");
const Util = require("../../../Helpers/Util");
const database = require("../../../Helpers/Database");

module.exports = {
    name: "karaliste", // Komutun ismi
    id: "karaliste", // Komutun ID'si
    aliases: [ // Komutun diğer çağırma isimleri
        "blacklist",
        "black-list",
        "blacklist-add",
        "blacklistadd",
        "blacklistekle",
        "karalistiekle",
        "karalisteekle",
        "karaliste-ekle",
    ],
    description: "Kullancıyı karalisteye ekler veya kaldırır", // Komutun açıklaması
    isAdmin: true, // Komutun sadece yönetici tarafından kullanılabilir olduğunu belirtir
    isOwner: false, // Komutun sadece bot sahibi tarafından kullanılabilir olduğunu belirtir

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj objesi
     * @param {String[]} args - Komutun argümanları
     */
    async execute(msg, args) {

        const prefix = process.env.PREFIX || "!";
        const exampleUsage = `${prefix}${this.name} ekle/çıkar @kullanıcı sebep`;

        const user = await Util.getUser(msg.client, args[1]?.replace(/[^0-9]/g, ""));

        switch (args[0]?.toLocaleLowerCase("tr")) {
            case "ekle":
            case "add":
            case "e": {
                // Eğer kullanıcı bulunamadıysa, kullanıcı bot ise veya sunucu sahibi ise hata ver
                if (!user) return Util.error(msg, `Kullanıcı bulunamadı! Lütfen bir kullanıcı belirtin.\n\n**Örnek Kullanım:**\n\`${exampleUsage}\``);
                if (user.bot) return Util.error(msg, `Botları karalisteye ekleyemezsiniz!`);
                if (user.id == msg.guild.ownerId) return Util.error(msg, `Sunucu sahibini karalisteye ekleyemezsiniz!`);

                // Eğer kişi zaten karalistede ise hata ver
                const isBlacklisted = await database.isBlacklisted(user.id);
                if (isBlacklisted) return Util.error(msg, `Bu kullanıcı zaten karalistede!`);

                // Eğer sebep verilmediyse hata ver
                const reason = args.slice(2).join(" ");
                if (!reason) return Util.error(msg, `Sebep verilmedi! Lütfen bir sebep belirtin.\n\n**Örnek Kullanım:**\n\`${exampleUsage}\``);

                // Karalisteye ekle
                await database.addUserToBlacklist(user.id, msg.author.id, reason);

                return msg.reply({
                    content: `• <@${user.id}> adlı kullanıcı karalisteye eklendi!\n` +
                        `• Sebep: \`${reason}\``,
                    allowedMentions: {
                        users: [user.id],
                        roles: [],
                        repliedUser: true
                    }
                });
            }

            case "çıkar":
            case "remove":
            case "kaldır":
            case "delete":
            case "r":
            case "d":
            case "sil": {
                // Eğer kullanıcı bulunamadıysa, kullanıcı bot ise veya sunucu sahibi ise hata ver
                if (!user) return Util.error(msg, `Kullanıcı bulunamadı! Lütfen bir kullanıcı belirtin.\n\n**Örnek Kullanım:**\n\`${exampleUsage}\``);
                if (user.bot) return Util.error(msg, `Botları karalisteden çıkaramazsınız!`);
                if (user.id == msg.guild.ownerId) return Util.error(msg, `Sunucu sahibini karalisteden çıkaramazsınız!`);

                // Eğer kişi zaten karalistede değilse hata ver
                const isBlacklisted = await database.isBlacklisted(user.id);
                if (!isBlacklisted) return Util.error(msg, `Bu kullanıcı zaten karalistede değil!`);

                // Karalisteden çıkar
                await database.removeUserFromBlacklist(user.id);

                return msg.reply({
                    content: `• <@${user.id}> adlı kullanıcı karalisteden çıkarıldı!`,
                    allowedMentions: {
                        users: [user.id],
                        roles: [],
                        repliedUser: true
                    }
                });
            }

            default: {
                // Eğer yanlış bir argüman verilmişse hata ver
                return Util.error(msg, `Yanlış argüman! Lütfen "ekle" veya "çıkar" yazın.\n\n**Örnek Kullanım:**\n\`${exampleUsage}\``);
            }
        }


    },
};