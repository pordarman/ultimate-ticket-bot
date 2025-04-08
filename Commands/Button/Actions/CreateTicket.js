"use strict";
const {
    ModalSubmitInteraction,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");
const database = require("../../../Helpers/Database");
const Util = require("../../../Helpers/Util");

module.exports = {
    name: "createTicket",

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {ModalSubmitInteraction} int - Modal
     */
    async execute(int) {
        const NOW = Date.now();

        const ticketCategoryValue = int.fields.getTextInputValue("ticketCategory");
        const ticketUrgencyValue = int.fields.getTextInputValue("ticketUrgency");
        const ticketReason = int.fields.getTextInputValue("ticketReason");

        let ticketCategory;
        let ticketContent;

        // Ticket kategorisini belirle
        switch (ticketCategoryValue.toLocaleLowerCase("tr").trim()) {
            case "öneri": {
                ticketCategory = "Öneri";
                ticketContent =
                    `__**Bilet kanalına hoşgeldin <@${int.user.id}>!**__\n` +
                    `Senin gibi topluluğumuza değer katmak isteyen birini görmek __harika__!\n` +
                    `Aşağıya bizimle paylaşmak istediğin **önerini** yazabilirsin ve resimlerle de destekleyebilirsin!\n` +
                    `bir **komut önerisi** ya da topluluğu daha iyi hale getirecek herhangi bir düşünce olabilir.\n` +
                    `Lütfen önerini **açık ve anlaşılır** bir şekilde belirtmeye çalış.\n` +
                    `Eğer önerin birden fazla adımdan oluşuyorsa, __madde madde yazman__ süreci hızlandıracaktır.\n` +
                    `Unutma, __her fikir değerlidir__ ve kesinlikle dikkate alınacaktır! 💡`;
            }
                break;
            case "şikayet": {
                ticketCategory = "Şikayet";
                ticketContent =
                    `__**Bilet kanalına hoşgeldin <@${int.user.id}>!**__\n` +
                    `Yapacağın şikayeti **ciddiyetle** ele alacağımızdan __emin olabilirsin__.\n` +
                    `Lütfen yaşadığın sorunu **detaylı bir şekilde** açıklayarak belirt.\n` +
                    `Eğer bir kullanıcıdan şikayetçiysen, **kullanıcı adı** veya __ID'sini__ eklersen çok yardımcı olur.\n` +
                    `Şikayet konusuyla ilgili varsa **ekran görüntüsü**, __mesaj linki__ gibi kanıtları da paylaşabilirsin.\n` +
                    `__Şeffaflık__ ve **güven ortamı** bizim için çok önemli.\n` +
                    `Destek ekibimiz en kısa sürede seninle ilgilenecek.`;
            }
                break;
            case "diğer": {
                ticketCategory = "Diğer";
                ticketContent =
                    `__**Bilet kanalına hoşgeldin <@${int.user.id}>!**__\n` +
                    `Bu kategori, doğrudan bir başlığa uymayan her türlü konuda sana yardımcı olabilmek için var.\n` +
                    `Lütfen __konunun neyle ilgili olduğunu__ ve nasıl bir destek istediğini açıkça belirt.\n` +
                    `__Ne kadar fazla detay verirsen__, sana o kadar hızlı ve etkili yardımcı olabiliriz.\n` +
                    `Gerekli durumlarda **dosya, resim veya bağlantı** da ekleyebilirsin.\n` +
                    `Unutma, **senin için buradayız** ve yardımcı olmaktan mutluluk duyarız! 🫶`;
            }
                break;
            default: {
                ticketCategory = "Genel Destek";
                ticketContent =
                    `__**Bilet kanalına hoşgeldin <@${int.user.id}>!**__\n` +
                    `Genel destek talepleri için doğru yerdesin!\n` +
                    `Yaşadığın sorunu ya da almak istediğin desteği **detaylı bir şekilde** anlatman çok önemli.\n` +
                    `__Hangi aşamada__ sorun yaşadığını, **ne zaman başladığını** ve neler denediğini belirtirsen, __çok daha hızlı yardımcı olabiliriz__\n` +
                    `Ayrıca, yaşadığın sorunu daha iyi anlamamız için **ekran görüntüsü** veya __video__ gibi ekler de ekleyebilirsin.\n` +
                    `Destek ekibimiz **en kısa sürede** geri dönüş yapacaktır.\n` +
                    `Lütfen sabırlı ol ve __yetkilileri etiketlemekten kaçın__. Biz buradayız! 💙`;
            }
        }

        // Aciliyeti 1-5 arasında bir sayıya çevir
        const ticketUrgency = Math.max(1, Math.min(5, Number(ticketUrgencyValue) || 1));
        const ticketUrgentEmoji = Util.ticketUrgentEmoji(ticketUrgency);

        // Kullanıcının daha önce ticket oluşturup oluşturmadığını kontrol et
        const userTicketInfo = await database.getUser(int.user.id);
        if (userTicketInfo.currentTicket !== null) return Util.error(int, `<#${userTicketInfo.currentTicket.channelId}> adlı kanalda zaten bir ticketin var!`)

        // Eğer daha önceden oluşturulmuş bir ticket varsa onu geri yükle
        if (userTicketInfo.closedTicket !== null) {
            const channel = int.guild.channels.cache.get(userTicketInfo.closedTicket.channelId);
            if (channel) {
                const formatTicketId = Util.formatTicketId(userTicketInfo.closedTicket.ticketId);

                const isEdited = await channel.edit(
                    Util.createChannelEditOptions(int.channel, {
                        name: `${ticketUrgentEmoji}ticket-${formatTicketId}`,
                        type: ChannelType.GuildText,
                        topic: `Bileti oluşturan: ${int.user.tag}`,
                        parent: process.env.TICKET_CATEGORY_ID ?? null,
                        permissionOverwrites: [
                            {
                                id: int.user.id,
                                allow: [
                                    PermissionsBitField.Flags.ViewChannel,
                                    PermissionsBitField.Flags.SendMessages,
                                    PermissionsBitField.Flags.AttachFiles
                                ]
                            },
                            {
                                id: int.guild.id,
                                deny: PermissionsBitField.Flags.ViewChannel
                            }
                        ]
                    })
                ).catch(() => null);
                if (!isEdited) {
                    return Util.error(int, "Bir hata oluştu ve ticket kanalı geri yüklenemedi! Lütfen bu durumu yetkililere bildirin")
                }

                userTicketInfo.currentTicket = {
                    channelId: userTicketInfo.closedTicket.channelId,
                    ticketId: userTicketInfo.closedTicket.ticketId,
                    createdTimestamp: NOW
                };
                userTicketInfo.lastTicketTimestamp = NOW;
                userTicketInfo.closedTicket = null;

                let isCreated = false;

                // Eğer ticket yoksa yeni bir tane oluştur
                let ticketInfo = await database.getTicket(userTicketInfo.currentTicket.channelId);
                if (!ticketInfo) {
                    isCreated = true;
                    ticketInfo = await database.createTicket({
                        channelId: channel.id,
                        authorId: int.user.id,
                        createdTimestamp: NOW,
                        reopenedTimestamp: NOW,
                        openedReason: ticketReason,
                        category: ticketCategory,
                        urgency: ticketUrgency,
                        ticketId: userTicketInfo.currentTicket.ticketId,
                        status: "opened",
                        lastUpdatedTimestamp: NOW,
                        messageCount: 0,
                    });
                }
                // Eğer ticket varsa güncelle
                else {
                    ticketInfo.reopenedTimestamp = NOW;
                    ticketInfo.category = ticketCategory;
                    ticketInfo.urgency = ticketUrgency;
                    ticketInfo.openedReason = ticketReason;
                    ticketInfo.status = "opened";
                    ticketInfo.lastUpdatedTimestamp = NOW;
                }
                const supportRoles = process.env.MOD_ROLE_IDS ? process.env.MOD_ROLE_IDS.split(",").map(id => `<@&${id.trim()}>`).join(", ") : null;

                const embedTicketInfo = new EmbedBuilder()
                    .setTitle("Ticket Bilgileri")
                    .addFields(
                        {
                            name: "📚 Bilet Kategori",
                            value: ticketCategory,
                            inline: true
                        },
                        {
                            name: "\u200b",
                            value: "\u200b",
                            inline: true
                        },
                        {
                            name: "🆘 Bilet Aciliyet",
                            value: `${ticketUrgentEmoji} (${ticketUrgency})`,
                            inline: true
                        },
                        {
                            name: "⚒️ Sorun",
                            value: ticketReason,
                            inline: false
                        }
                    )
                    .setColor("Blue")
                    .setTimestamp();

                const actionRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Bileti kapat")
                            .setEmoji("🔒")
                            .setCustomId(`closeTicketForm-${int.user.id}`)
                            .setStyle(ButtonStyle.Primary)
                    );

                return await Promise.all([
                    database.updateUser(userTicketInfo.currentTicket.channelId, {
                        $set: {
                            currentTicket: userTicketInfo.currentTicket,
                            lastTicketTimestamp: userTicketInfo.lastTicketTimestamp,
                            closedTicket: userTicketInfo.closedTicket
                        }
                    }),
                    !isCreated && database.updateTicket(userTicketInfo.currentTicket.channelId, {
                        $set: {
                            reopenedTimestamp: NOW,
                            category: ticketCategory,
                            urgency: ticketUrgency,
                            openedReason: ticketReason,
                            status: "opened",
                            lastUpdatedTimestamp: NOW
                        }
                    }),
                    Util.sendLog({
                        int,
                        channelId: channel.id,
                        ticketId: ticketInfo.ticketId,
                        action: "ticket_reopened",
                        timestamp: NOW,
                        by: int.user.id,
                        reason: ticketReason,
                        ticketAuthorId: int.user.id,
                    }),
                    channel.send({
                        content: `<@${int.user.id}>'nın bir kahramana ihtiyacı var! (yeniden)${supportRoles ? ` ${supportRoles}` : ""}`,
                        embeds: [
                            embedTicketInfo
                        ],
                        components: [
                            actionRow
                        ]
                    }),
                    int.reply({
                        content: `**• <#${channel.id}>** adlı bilet kanalın başarıyla geri yüklendi!`,
                        flags: MessageFlags.Ephemeral
                    })
                ]);
            }
        }

        const [_, ticketId] = await Promise.all([
            int.deferReply({
                content: "Ticket oluşturuluyor...",
                flags: MessageFlags.Ephemeral,
                withResponse: true
            }),
            database.getNextTicketNumber()
        ]);

        // Ticket oluştur
        const formatTicketId = Util.formatTicketId(ticketId);

        const channel = await int.channel.guild.channels.create(
            Util.createChannelEditOptions({ guild: int.guild }, {
                name: `${ticketUrgentEmoji}ticket-${formatTicketId}`,
                type: ChannelType.GuildText,
                topic: `Bileti oluşturan: ${int.user.tag}`,
                parent: process.env.TICKET_CATEGORY_ID ?? null,
                permissionOverwrites: [
                    {
                        id: int.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.AttachFiles
                        ]
                    },
                    {
                        id: int.guild.id,
                        deny: PermissionsBitField.Flags.ViewChannel
                    }
                ]
            })
        ).catch(() => null);

        // Eğer kanal oluşturulamazsa
        if (!channel) {
            return int.editReply({
                content: "Bir hata oluştu ve ticket oluşturulamadı! Lütfen bu durumu yetkililere bildirin",
                flags: MessageFlags.Ephemeral
            });
        }

        // Ticket bilgilerini kaydet
        userTicketInfo.currentTicket = {
            ticketId,
            channelId: channel.id,
            createdTimestamp: NOW
        };
        userTicketInfo.lastTicketTimestamp = NOW;
        userTicketInfo.ticketCounts.opened += 1;

        await Promise.all([
            database.createTicket({
                channelId: channel.id,
                authorId: int.user.id,
                createdTimestamp: NOW,
                openedReason: ticketReason,
                category: ticketCategory,
                urgency: ticketUrgency,
                ticketId,
                status: "opened",
                lastUpdatedTimestamp: NOW,
                messageCount: 0,
            }),
            database.updateUser(int.user.id, {
                $set: {
                    currentTicket: userTicketInfo.currentTicket,
                    lastTicketTimestamp: userTicketInfo.lastTicketTimestamp,
                    ticketCounts: userTicketInfo.ticketCounts
                }
            }),
            Util.sendLog({
                int,
                channelId: channel.id,
                ticketId,
                action: "ticket_opened",
                timestamp: NOW,
                by: int.user.id,
                reason: ticketReason,
                ticketAuthorId: int.user.id,
            })
        ]);

        // Bilet kanalına mesaj gönder
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Bileti kapat")
                    .setEmoji("🔒")
                    .setCustomId(`closeTicketForm`)
                    .setStyle(ButtonStyle.Primary)
            );

        const supportRoles = process.env.MOD_ROLE_IDS ? process.env.MOD_ROLE_IDS.split(",").map(id => `<@&${id.trim()}>`).join(", ") : null;

        const memberAvatar = int.member.displayAvatarURL({ extension: "png", forceStatic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setAuthor({
                name: int.user.tag,
                iconURL: memberAvatar
            })
            .setDescription(ticketContent)
            .setColor("Blue")
            .setTimestamp();

        const embedTicketInfo = new EmbedBuilder()
            .setTitle("Ticket Bilgileri")
            .addFields(
                {
                    name: "📚 Bilet Kategori",
                    value: ticketCategory,
                    inline: true
                },
                {
                    name: "\u200b",
                    value: "\u200b",
                    inline: true
                },
                {
                    name: "🆘 Bilet Aciliyet",
                    value: `${ticketUrgentEmoji} (${ticketUrgency})`,
                    inline: true
                },
                {
                    name: "⚒️ Sorun",
                    value: ticketReason,
                    inline: false
                }
            )
            .setColor("Blue")
            .setTimestamp();

        channel.send({
            content: `<@${int.user.id}>'nın bir kahramana ihtiyacı var!${supportRoles ? ` ${supportRoles}` : ""}`,
            embeds: [
                embed,
                embedTicketInfo
            ],
            components: [
                actionRow
            ]
        });

        // Ticket oluşturuldu mesajını gönder
        return int.editReply({
            content: `Ticket oluşturuldu! <#${channel.id}>`,
            flags: MessageFlags.Ephemeral
        });
    }
}