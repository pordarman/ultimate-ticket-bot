"use strict";
const {
    Events,
    Client
} = require("discord.js");
const DiscordVoice = require("@discordjs/voice");
const database = require("../Helpers/Database.js");
const Util = require("../Helpers/Util.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

module.exports = {
    name: Events.ClientReady,
    once: true, // Bu event sadece bir kez çalıştırılacak

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Client} client - Discord istemcisi
     */
    async execute(client) {

        const NOW = Date.now();

        Util.console.log(`${client.user.tag} hazır!`);

        if (process.env.VOICE_CHANNEL_ID) {
            const channel = client.channels.cache.get(process.env.VOICE_CHANNEL_ID);

            // Eğer kanal yoksa hiçbir şey yapma
            if (!channel) return;

            const guild = channel.guild;

            DiscordVoice.joinVoiceChannel({
                channelId: process.env.VOICE_CHANNEL_ID,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true
            });
        }

        // Bütün ticketleri yükle ve kontrol et (kanalın silinip silinmediğini kontrol et)
        const ticketChannels = await database.getTicketsByFilter({ status: { $ne: "perm_closed" } });
        await Promise.all(
            ticketChannels.map(async (ticketChannel) => {
                const channel = client.channels.cache.get(ticketChannel.channelId);
                if (!channel) {
                    // Eğer kanal yoksa ticketin statusunu "perm_closed" yap ve kullanıcının ticketini kapat
                    ticketChannel.status = "perm_closed";
                    ticketChannel.permClosedTimestamp = NOW;
                    ticketChannel.lastUpdatedTimestamp = NOW;
                    ticketChannel.closedReason = "Ticket kanalı birisi tarafından silindi!";
                    ticketChannel.closedBy = "Bilinmiyor";

                    delete ticketChannel.reopenedTimestamp;
                    delete ticketChannel.closedTimestamp;

                    const userTicketInfo = await database.getUser(ticketChannel.authorId);
                    const setObject = {};
                    const unsetObject = {};

                    if (userTicketInfo.currentTicket?.channelId === ticketChannel.channelId) {
                        userTicketInfo.currentTicket = setObject.currentTicket = null;
                    }
                    if (userTicketInfo.closedTicket?.channelId === ticketChannel.channelId) {
                        userTicketInfo.closedTicket = setObject.closedTicket = null;
                    }
                    if (userTicketInfo.archivedTickets[ticketChannel.ticketId]) {
                        delete userTicketInfo.archivedTickets[ticketChannel.ticketId];
                        unsetObject[`archivedTickets.${ticketChannel.ticketId}`] = "";
                    }

                    await Promise.all([
                        database.updateTicket(ticketChannel.channelId, {
                            $set: {
                                status: ticketChannel.status,
                                permClosedTimestamp: ticketChannel.permClosedTimestamp,
                                lastUpdatedTimestamp: ticketChannel.lastUpdatedTimestamp,
                                closedReason: ticketChannel.closedReason,
                                closedBy: ticketChannel.closedBy,
                            },
                            $unset: {
                                reopenedTimestamp: "",
                                closedTimestamp: ""
                            }
                        }),
                        database.updateUser(ticketChannel.authorId, {
                            $set: setObject,
                            $unset: unsetObject
                        }),
                        Util.sendLog({
                            int: {
                                user: { id: ticketChannel.closedBy },
                                client
                            },
                            channelId: ticketChannel.channelId,
                            ticketId: ticketChannel.ticketId,
                            action: "channel_delete",
                            timestamp: NOW,
                            by: ticketChannel.closedBy,
                            reason: "Ticket kanalı birisi tarafından silindi",
                            ticketAuthorId: ticketChannel.authorId,
                            otherInfo: {
                                ticketAuthorUserName: ticketChannel.authorId
                            }
                        })
                    ]);
                }
            })
        );
        database.resetCache();

        const ticketChannel = client.channels.cache.get(process.env.TICKET_CHANNEL_ID);
        if (!ticketChannel) {
            Util.console.error(`Ticket kanalı bulunamadı!`);
            return;
        }

        if (process.env.SEND_MESSAGE == "1") Util.sendTicketMessage(ticketChannel);

        // Slash komutlarını yükle
        client.guilds.cache.forEach(async (guild) => {
            try {
                await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), {
                    body: Util.getSlashDataJSON()
                });
                Util.console.log(`Slash komutları yüklendi!`);
            } catch (error) {
                Util.console.error(`Slash komutları yüklenirken hata oluştu: ${error}`);
            }
        });
    }
}