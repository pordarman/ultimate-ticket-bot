"use strict";
const {
    EmbedBuilder,
    ButtonInteraction,
    PermissionsBitField,
    GuildMember,
    User,
    Message,
    MessageFlags,
    ModalSubmitInteraction,
    TextChannel,
    Client,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
} = require("discord.js");
const database = require("./Database");
const { default: chalk } = require("chalk");

const prefixCommands = new Map();
const prefixCommandWithId = new Map();
const buttonCommands = new Map();
const slashCommands = new Map();
const slashDataJSON = [];

/**
 * @typedef {Object} Command
 * @property {String} name - Komut adı
 * @property {String} id - Komut ID'si
 * @property {Array<String>} aliases - Komutun diğer isimleri
 * @property {Boolean} isOwner - Komutun sadece bot sahibi tarafından kullanılabilir olduğunu belirtir
 * @property {Boolean} isAdmin - Komutun sadece yönetici tarafından kullanılabilir olduğunu belirtir
 * @property {Function} execute - Komutun çalıştırılacağı fonksiyon
 */

/**
 * @typedef {Object} LogObject
 * @property {ButtonInteraction|Message} int - ButtonInteraction
 * @property {String} channelId - Kanal ID
 * @property {String} ticketId - Ticket numarası
 * @property {"ticket_opened" | "ticket_reopened" | "ticket_closed" | "ticket_permclosed" | "ticket_archived" | "user_call" | "channel_delete"} action - Log tipi
 * @property {Number} timestamp - Logun atıldığı zaman
 * @property {String} by - Logu yapan kişinin ID'si
 * @property {String} reason - Logun sebebi
 * @property {String} ticketAuthorId - Ticketin sahibinin ID'si
 * @property {{ ticketAuthorUserName: String, deleteUser?: User }} otherInfo - Diğer bilgiler
 */

/**
  * @typedef {Object} GuildChannelEditOptions
  * @property {string} [name] Kanal adı
  * @property {?string} [topic] Kanal konusu
  * @property {Number} [type] Kanal tipi
  * @property {Number} [parent] Kategorinin ID'si
  * @property {Array<({ id: String, allow: Array, deny: Array })>} [permissionOverwrites]
  */


class Util {

    /**
     * Bir hata mesajı gönderir 
     * @param {Message|ButtonInteraction|ModalSubmitInteraction} message - Mesaj
     * @param {String} content - Embed mesajın içeriği
     * @returns {Promise<Message>}
    */
    error(message, content) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(`:x: ${content}`)
            ],
            flags: MessageFlags.Ephemeral
        });
    }


    get reasons() {
        return {
            archived: "Bilet arşivlendi!",
            closed: "Bilet kapatıldı!",
            permclosed: "Bilet kalıcı olarak kapatıldı!",
            call: "Kullanıcı çağrıldı!"
        }
    }

    /**
     * Bir prefix komutu ekler
     * @param {String} commandName - Komut adı 
     * @param {Command} command - Komut
     */
    setPrefixCommand(commandName, command) {
        prefixCommands.set(commandName, command);
    }

    /**
     * Prefix komutunu döndürür
     * @param {String} commandName - Komut adı
     * @return {Command} - Komut
     */
    getPrefixCommand(commandName) {
        return prefixCommands.get(commandName);
    }

    /**
     * Prefix komutlarını temizler
     */
    clearPrefixCommands() {
        prefixCommands.clear();
    }


    /**
     * Prefix komutunu ID'si ile yazar
     * @param {String} commandId - Komut ID'si
     * @param {String} commandName - Komut adı
     */
    setPrefixCommandWithId(commandId, commandName) {
        prefixCommandWithId.set(commandId, commandName);
    }


    /**
     * Girilen ID'ye göre prefix komutunu döndürür
     * @param {String} commandId - Komut ID'si
     * @returns {Command} - Komut
     */
    getPrefixCommandWithId(commandId) {
        return prefixCommands.get(prefixCommandWithId.get(commandId));
    }


    /**
     * Prefix komutlarının ID'sini ve komutları döndürür
     * @returns {Map<String, String>} - Komutlar
     */
    getPrefixCommandIds() {
        return prefixCommandWithId;
    }


    /**
     * Prefix komut ID'lerini temizler
     */
    clearPrefixCommandWithId() {
        prefixCommandWithId.clear();
    }

    /**
     * Bir buton komutu ekler
     * @param {String} commandName - Komut adı 
     * @param {Command} command - Komut
     */
    setButtonCommand(commandName, command) {
        buttonCommands.set(commandName, command);
    }

    /**
     * Buton komutunu döndürür
     * @param {String} commandName - Komut adı
     * @return {Command} - Komut
     */
    getButtonCommand(commandName) {
        return buttonCommands.get(commandName);
    }

    /**
     * Buton komutlarını temizler
     */
    clearButtonCommands() {
        buttonCommands.clear();
    }

    /**
     * Bir slash komutu ekler
     * @param {String} commandName - Komut adı 
     * @param {Command} command - Komut
     */
    setSlashCommand(commandName, command) {
        slashCommands.set(commandName, command);
    }

    /**
     * Slash komutunu döndürür
     * @param {String} commandName - Komut adı
     * @return {Command} - Komut
     */
    getSlashCommand(commandName) {
        return slashCommands.get(commandName);
    }

    /**
     * Slash komutlarını temizler
     */
    clearSlashCommands() {
        slashCommands.clear();
    }

    /**
     * Slash komutları için JSON verisini döndürür
     * @return {Array} - Slash komutları için JSON verisi
     */
    getSlashDataJSON() {
        return slashDataJSON;
    }

    /**
     * Slash komutları için JSON verisini ayarlar
     * @param {Object} data - Slash komutları için JSON verisi
     */
    pushSlashDataJSON(data) {
        slashDataJSON.push(data);
    }

    /**
     * Slash komutları için JSON verisini temizler
     */
    clearSlashDataJSON() {
        slashDataJSON.length = 0;
    }



    get console() {
        return {
            /**
             * Log mesajı gönderir (Örnek: [2023-10-01 12:00:00] Log mesajı)
             * @param {String} message 
             * @returns 
             */
            log: (message) => console.log(chalk.hex("#00FFFF")(`[${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}] ${message}`)),

            /**
             * Yeşil bir başarılı mesajı gönderir (Örnek: [INFO] Başarılı log mesajı)
             * @param {String} message 
             * @returns 
             */
            success: (message) => console.log(chalk.green(`[INFO] ${message}`)),

            /**
             * Kırmızı bir hata mesajı gönderir (Örnek: [ERROR] Hata log mesajı)
             * @param {String} message 
             * @returns 
             */
            error: (message) => console.log(chalk.red(`[ERROR] ${message}`)),

            /**
             * Turuncu bir uyarı mesajı gönderir (Örnek: [WARN] Uyarı log mesajı)
             * @param {String} message 
             * @returns 
             */
            warn: (message) => console.log(chalk.hex("#FFA500")(`[WARN] ${message}`)),
        }
    }


    /**
     * Kullanıcının moderatör olup olmadığını kontrol eder
     * @param {GuildMember} member - Kullanıcı
     * @returns {Boolean} - Kullanıcı moderatör mü?
     */
    isModerator(member) {
        // Eğer kişi yönetici ise return true
        if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

        // Eğer mod rolleri yoksa false döndür
        if (process.env.MOD_ROLE_IDS == null) return false;

        const modRolesSet = new Set(process.env.MOD_ROLE_IDS.split(",").map(role => role.trim()));
        return member.roles.cache.some(role => modRolesSet.has(role.id));
    }


    /**
     * Ticket kanalına mesaj gönderir
     * @param {TextChannel} channel - Ticket kanalı
     * @returns {Promise<Message>} - Gönderilen mesaj
     */
    sendTicketMessage(channel) {
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Bilet oluştur")
                    .setEmoji("🎫")
                    .setCustomId("createTicketForm")
                    .setStyle(ButtonStyle.Primary)
            );

        const clientAvatar = channel.client.user.displayAvatarURL({ extension: "png", forceStatic: true, size: 1024 });

        const rules = `• \`#1\` Gereksiz bilet kanalı açıp destek ekibimizi meşgul etmeyiniz\n` +
            `• \`#2\` Oluşturduğunuz bilet kanalında yetkilileri etiketleyip rahatsız etmeyiniz müsait olduğunca sizinle ilgileneceğiz\n` +
            `• \`#3\` Bilet kanalını açtıktan sonra bizim yazmamızı beklemeden direkt sorununuzu kısa ve anlaşılabilir bir şekilde anlatınız\n` +
            `• \`#4\` Lütfen sorununuzu anlatırken saygılı bir biçimde konuşunuz\n` +
            `• \`#5\` Eğer yetkililerden yardımınızı aldıysanız bileti kapatınız\n` +
            `• \`#6\` Sürekli bilet açıp kapatan kişiler ilk önce uyarılacak eğer bir kez daha yaparlarsa **BAN** yiyeceklerdir`;

        const embed = new EmbedBuilder()
            .setAuthor({
                name: channel.client.user.tag,
                iconURL: clientAvatar
            })
            .setDescription(`• **Bilet oluşturmak için aşağıdaki butona tıklayınız**`)
            .addFields(
                {
                    name: "BİLET OLUŞTURMA KURALLARI",
                    value: rules
                }
            )
            .setColor("#0d81fb")
            .setThumbnail(clientAvatar)
            .setTimestamp();

        channel.send({
            embeds: [
                embed
            ],
            components: [
                actionRow
            ]
        });
    }


    /**
     * Girilen interaction'ı message objesine çevirir
     * @param {ChatInputCommandInteraction} int - Interaction objesi
     * @param {{ content: String, mentions: { user: User, member: GuildMember, role: Role, channel: Channel } }} options - Ekstra bilgiler
     * @returns {Message} - Message objesi
     */
    interactionToMessage(int, { content, mentions } = {}) {
        const message = int;

        // Eğer message objesinde "content: ''" ifadesi yoksa ekle
        if (!message.content) message.content = content || "";

        // message.author'u message.user yap ve sil
        message.author = message.user;
        delete message.user;

        // Eğer message, main, mentions objesi yoksa oluştur
        if (!mentions) mentions = {};

        // message objesine mentions.users, mentions.members, mentions.roles ve mentions.channels ekle
        message.mentions = {};
        const mentionsEntries = [["users", "user"], ["members", "member"], ["roles", "role"], ["channels", "channel"]];
        for (const [key, value] of mentionsEntries) {
            message.mentions[key] = {
                first() {
                    return mentions[value];
                }
            }
        }

        return message;
    }


    /**
     * Girilen message objesini buton interaction objesine çevirir
     * @param {Message} message - Message objesi
     * @returns {ButtonInteraction} - Interaction objesi
     */
    messageToButtonInteraction(message) {
        const int = message;
        int.user = int.author;

        return int;
    }



    /**
     * Girilen ticketId'yi varsayılan olarak 6 basamaklı bir string'e çevirir
     * @param {Number} ticketId - Ticket ID'si
     * @returns {String} - 6 basamaklı string
     */
    formatTicketId(ticketId) {
        const digitCount = parseInt(process.env.TICKET_DIGIT_COUNT) || 6; // varsayılan olarak 6 basamak
        return ticketId.toString().padStart(digitCount, '0');
    }


    /**
     * Ticket aciliyetini emoji ile gösterir
     * @param {Number} urgent - Ticket aciliyet seviyesi (1-5)
     * @returns {String} - Emoji
     */
    ticketUrgentEmoji(urgent) {
        return ["", "⚪", "🟢", "🟡", "🟣", "🔴"][urgent]
    }


    /**
     * String'i belirtilen uzunluğa kısaltır ve sonuna "..." ekler
     * @param {String} string - Kısaltılacak string
     * @param {Number} length - Kısaltılacak uzunluk
     * @returns {String} - Kısaltılmış string   
     */
    truncateString(string, length) {
        return string.length > length ? string.slice(0, length - 3) + "..." : string;
    }


    /**
    * .slice .map ve .join komutlarını art arda kullanmaya gerek kalmadan hepsini tek bir döngüde yapmanızı sağlar
    * @param {Array|Collection} array 
    * @param {Number} startIndex
    * @param {Number} endIndex
    * @param {(any, index) => String} mapCallback 
    * @param {String} joinString 
    * @returns {String}
    */
    sliceMapAndJoin(array, startIndex, endIndex, mapCallback, joinString) {
        let finalStr = "";

        // Eğer array bir Collection ise array'a çevir
        if (array.size) array = [...array.values()];

        const minForLoop = Math.min(endIndex, array.length);

        for (let i = startIndex; i < minForLoop; ++i) {
            const result = mapCallback(array[i], i);

            // Eğer ilk döngüdeyse joinString'i ekleme
            finalStr += (i == 0 ? "" : joinString) + result
        }

        return finalStr;
    }


    /**
     * Girilen değerin bir Message olup olmadığını kontrol eder
     * @param {any} value - Kontrol edilecek değer
     * @returns {Boolean}
     */
    isMessage(value) {
        return value instanceof Message;
    }


    /**
     * Kullanıcıyı alır
     * @param {Client} client - Discord Client
     * @param {String} userId - Kullanıcı ID'si
     * @returns {Promise<GuildMember | null>} - Kullanıcı bilgisi
     */
    async getUser(client, userId) {
        return client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);
    }


    /**
     * 
     * @param {TextChannel} channel - Kanal
     * @param {GuildChannelEditOptions} param0 
     */
    createChannelEditOptions(channel, {
        name,
        topic,
        type,
        parent,
        permissionOverwrites
    }) {

        const map = new Map();
        for (let i = 0; i < permissionOverwrites.length; i++) {
            const overwrite = permissionOverwrites[i];
            map.set(overwrite.id, {
                allow: overwrite.allow,
                deny: overwrite.deny
            });
        }

        // Ve eğer MOD_ROLE_IDS rolleri varsa onları da ekle
        const modRoles = process.env.MOD_ROLE_IDS?.split(",")?.map(role => role.trim());
        if (modRoles) {
            for (const role of modRoles) {
                // Önce rol ID'si doğru mu kontrol et ve mapte yoksa ekle
                if (channel.guild.roles.cache.has(role) && !map.has(role)) {
                    // Eğer varsa onu ekle
                    map.set(role, {
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.AttachFiles
                        ],
                        deny: []
                    });
                }
            }
        }

        const options = {
            name,
            topic,
            type,
            parent,
            permissionOverwrites: channel?.permissionOverwrites?.cache?.map(overwrite => {
                // Eğer overwrite id'si mapte varsa onu kullan
                const cachedOverwrite = map.get(overwrite.id);
                if (cachedOverwrite) {
                    map.delete(overwrite.id);
                    return {
                        id: overwrite.id,
                        allow: cachedOverwrite.allow,
                        deny: cachedOverwrite.deny
                    }
                }
                // Eğer overwrite id'si mapte yoksa onu kullan
                return {
                    id: overwrite.id,
                    allow: overwrite.allow,
                    deny: overwrite.deny
                }
            }) || [],
        };

        // Eğer mapte kalan overwrite'ler varsa onları ekle
        for (const [id, { allow, deny }] of map) {
            options.permissionOverwrites.push({
                id,
                allow,
                deny
            });
        }
        
        console.log(options);

        return options;

    }

    /**
     * Databaseye log kaydı yapar ve log mesajı gönderir
     * @param {LogObject} param0
     * @returns {Promise<void>}
     */
    async sendLog({
        int,
        channelId,
        ticketId,
        action,
        timestamp,
        by,
        reason,
        ticketAuthorId,
        otherInfo = {}
    }) {
        // İlk önce databaseye kaydet
        await database.logTicket(
            {
                action,
                by,
                reason,
                timestamp
            },
            {
                ticketId,
                channelId,
                ticketAuthorId
            }
        );

        const channel = int.client.channels.cache.get(process.env.LOG_CHANNEL_ID?.trim());
        if (!channel) return;

        const timestampInSeconds = Math.floor(timestamp / 1000);

        const embed = new EmbedBuilder()
            .setTitle(`${int.client.user.tag} Log`)
            .setColor("Blue")
            .setTimestamp();

        switch (action) {
            case "ticket_opened":
                embed
                    .setDescription(`🏷️ <@${int.user.id}> **(${int.user.tag})** adlı kullanıcı bir ticket oluşturdu!`)
                    .addFields(
                        {
                            name: `Bilgileri`,
                            value: `**• Kullanıcı:** ${int.user.tag} - ${int.user.id}\n` +
                                `**• Kanal:** <#${channelId}> - ${channelId}\n` +
                                `**• Ticket ID:** ${ticketId}\n` +
                                `**• Zamanı:** <t:${timestampInSeconds}:R> - <t:${timestampInSeconds}:F>`
                        }
                    )
                break;

            case "ticket_reopened":
                embed
                    .setDescription(`🏷️ <@${int.user.id}> **(${int.user.tag})** adlı kullanıcı bir ticket oluşturdu!`)
                    .addFields(
                        {
                            name: `Bilgileri`,
                            value: `**• Kullanıcı:** ${int.user.tag} - ${int.user.id}\n` +
                                `**• Kanal:** <#${channelId}> - ${channelId}\n` +
                                `**• Ticket ID:** ${ticketId}\n` +
                                `**• Zamanı:** <t:${timestampInSeconds}:R> - <t:${timestampInSeconds}:F>`
                        }
                    )
                break;

            case "ticket_closed":
                // Eğer kişide Yönetici yetkisi varsa
                if (int.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    embed
                        .setDescription(`🔒 <@${int.user.id}> **(${int.user.tag})** adlı yetkili <@${ticketAuthorId}> **(${otherInfo.ticketAuthorUserName})** adlı kişinin ticketini kapattı!`)
                        .addFields(
                            {
                                name: `Bilgileri`,
                                value: `**• Yetkili:** ${int.user.tag} - ${int.user.id}\n` +
                                    `**• Kanal:** <#${channelId}> - ${channelId}\n` +
                                    `**• Bilet sahibi:** ${otherInfo.ticketAuthorUserName} - ${ticketAuthorId}\n` +
                                    `**• Ticket ID:** ${ticketId}\n` +
                                    `**• Zamanı:** <t:${timestampInSeconds}:R> - <t:${timestampInSeconds}:F>`
                            }
                        )
                } else {
                    embed
                        .setDescription(`🔒 <@${int.user.id}> **(${int.user.tag})** adlı kullanıcı bir ticket kapattı!`)
                        .addFields(
                            {
                                name: `Bilgileri`,
                                value: `**• Kullanıcı:** ${int.user.tag} - ${int.user.id}\n` +
                                    `**• Kanal:** <#${channelId}> - ${channelId}\n` +
                                    `**• Ticket ID:** ${ticketId}\n` +
                                    `**• Zamanı:** <t:${timestampInSeconds}:R> - <t:${timestampInSeconds}:F>`
                            }
                        )
                }
                break;

            case "ticket_permclosed":
                embed
                    .setDescription(`❌ <@${int.user.id}> **(${int.user.tag})** adlı yetkili <@${ticketAuthorId}> **(${otherInfo.ticketAuthorUserName})** adlı kişinin ticketini kalıcı olarak kapattı!`)
                    .addFields(
                        {
                            name: `Bilgileri`,
                            value: `**• Yetkili:** ${int.user.tag} - ${int.user.id}\n` +
                                `**• Bilet sahibi:** ${otherInfo.ticketAuthorUserName} - <@${ticketAuthorId}>\n` +
                                `**• Ticket ID:** ${ticketId}\n` +
                                `**• Zamanı:** <t:${timestampInSeconds}:R> - <t:${timestampInSeconds}:F>`
                        }
                    )
                break;

            case "ticket_archived":
                embed
                    .setDescription(`📦 <@${int.user.id}> **(${int.user.tag})** adlı yetkili <@${ticketAuthorId}> **(${otherInfo.ticketAuthorUserName})** adlı kişinin biletini arşivledi`)
                    .addFields(
                        {
                            name: `Bilgileri`,
                            value: `**• Yetkili:** ${int.user.tag} - ${int.user.id}\n` +
                                `**• Kanal:** <#${channelId}> - ${channelId}\n` +
                                `**• Bilet sahibi:** ${otherInfo.ticketAuthorUserName} - <@${ticketAuthorId}>\n` +
                                `**• Ticket ID:** ${ticketId}\n` +
                                `**• Zamanı:** <t:${timestampInSeconds}:R> - <t:${timestampInSeconds}:F>`
                        }
                    )
                break;

            case "user_call":
                embed
                    .setDescription(`👤 <@${int.user.id}> **(${int.user.tag})** adlı yetkili <@${ticketAuthorId}> **(${otherInfo.ticketAuthorUserName})** adlı kişiyi çağırdı!`)
                    .addFields(
                        {
                            name: `Bilgileri`,
                            value: `**• Yetkili:** ${int.user.tag} - ${int.user.id}\n` +
                                `**• Kanal:** <#${channelId}> - ${channelId}\n` +
                                `**• Bilet sahibi:** ${otherInfo.ticketAuthorUserName} - <@${ticketAuthorId}>\n` +
                                `**• Ticket ID:** ${ticketId}\n` +
                                `**• Zamanı:** <t:${timestampInSeconds}:R> - <t:${timestampInSeconds}:F>`
                        }
                    )
                break;

            case "channel_delete":
                embed
                    .setDescription(`🗑️ ${otherInfo.deleteUser ? `<@${otherInfo.deleteUser.id}> **(${otherInfo.deleteUser.tag})** adlı` : "Bir"} yetkili **${channelId}** adlı kanalı eliyle sildi!`)
                    .addFields(
                        {
                            name: `Bilgileri`,
                            value: `**• Yetkili:** ${otherInfo.deleteUser ? `${otherInfo.deleteUser.tag} - ${otherInfo.deleteUser.id}` : "Bilinmiyor"}\n` +
                                `**• Kanal:** <#${channelId}> - ${channelId}\n` +
                                `**• Bilet sahibi:** ${otherInfo.ticketAuthorUserName} - <@${ticketAuthorId}>\n` +
                                `**• Ticket ID:** ${ticketId}\n` +
                                `**• Zamanı:** <t:${timestampInSeconds}:R> - <t:${timestampInSeconds}:F>`
                        }
                    )
                break;

            default:
                return;
        }

        channel.send({
            embeds: [
                embed
            ]
        });

    }

}

module.exports = new Util();