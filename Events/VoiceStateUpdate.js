"use strict";
const {
    VoiceState,
} = require("discord.js");
const DiscordVoice = require("@discordjs/voice");
const Util = require("../Helpers/Util.js");

module.exports = {
    name: "voiceStateUpdate",

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {VoiceState} oldVoice - Eski ses durumu
     * @param {VoiceState} newVoice - Yeni ses durumu
     */
    async run(oldVoice, newVoice) {
        try {

            // Eğer process.env.VOICE_CHANNEL_ID yoksa veya bot bizim bot değilse hiçbir şey yapma
            if (
                !process.env.VOICE_CHANNEL_ID ||
                newVoice.member.id != newVoice.client.user.id
            ) return;

            // Eğer yeni ses durumu yoksa voice kanalına katıl
            if (!newVoice.channelId) {
                // 1 saniye gecikmeli bir şekilde çalıştır
                setTimeout(async () => {
                    DiscordVoice.joinVoiceChannel({
                        channelId: process.env.VOICE_CHANNEL_ID.trim(),
                        guildId: oldVoice.guild.id,
                        adapterCreator: newVoice.guild.voiceAdapterCreator,
                        selfDeaf: true,
                        selfMute: true
                    });
                }, 1 * 1000);
            }
        } catch (e) {
            Util.console.error(e);
        }
    }
}