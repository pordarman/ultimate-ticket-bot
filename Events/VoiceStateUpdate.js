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

            // Eğer sunucu destek sunucusu değilse veya Alisa Guard değilse hiçbir şey yapma
            if (newVoice.guild.id != process.env.GUILD_ID || newVoice.member.id != newVoice.client.user.id) return;

            // Eğer bot Alisa Guard ise ve ses kanalından çıkmışsa tekrar ses kanalına giriş yap 
            if (!newVoice.channelId) DiscordVoice.joinVoiceChannel({
                channelId: oldVoice.channelId,
                guildId: oldVoice.guild.id,
                adapterCreator: newVoice.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true
            });
        } catch (e) {
            Util.console.error(e);
        }
    }
}