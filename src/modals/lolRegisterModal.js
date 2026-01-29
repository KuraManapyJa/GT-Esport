require("colors");
const { EmbedBuilder, MessageFlags } = require("discord.js");
const lolAccountSchema = require("../schemas/lolAccountSchema");
const RiotAPI = require("../utils/riotAPI");
const mConfig = require("../messageConfig.json");

module.exports = {
  customId: "lol_register_modal",
  run: async (client, interaction) => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Extract Role ID from Modal Custom ID
      const roleId = interaction.customId.split("_")[3];

      const gameName = interaction.fields.getTextInputValue("gameName");
      const tagLine = interaction.fields.getTextInputValue("tagLine");
      let regionInput = interaction.fields
        .getTextInputValue("region")
        .toLowerCase()
        .trim();

      // Normalize region input
      const regionMap = {
        euw: "euw1",
        euw1: "euw1",
        "europe west": "euw1",
        eune: "eun1",
        eun1: "eun1",
        na: "na1",
        na1: "na1",
        kr: "kr",
        korea: "kr",
        br: "br1",
        br1: "br1",
        jp: "jp1",
        jp1: "jp1",
        ru: "ru",
        tr: "tr1",
        tr1: "tr1",
        lan: "la1",
        la1: "la1",
        las: "la2",
        la2: "la2",
        oce: "oc1",
        oc1: "oc1",
      };

      const region = regionMap[regionInput];

      if (!region) {
        return interaction.editReply({
          content:
            "❌ Région invalide. Veuillez utiliser un code valide (ex: EUW, NA, KR).",
        });
      }

      const apiKey = process.env.RIOT_API_KEY;
      if (!apiKey) {
        return interaction.editReply({
          content: "❌ La clé API Riot n'est pas configurée.",
        });
      }

      const riotAPI = new RiotAPI(apiKey);

      // 1. Verify Account & Get PUUID
      let accountData;
      try {
        accountData = await riotAPI.getAccountByRiotId(
          gameName,
          tagLine,
          region,
        );
      } catch (error) {
        return interaction.editReply({
          content: `❌ Impossible de trouver le compte **${gameName}#${tagLine}** sur ${region.toUpperCase()}.\nVérifiez le pseudo, le tag et la région.`,
        });
      }

      // 2. Get Rank info
      let rankString = "Unranked";
      let tier = "UNRANKED";
      let lp = 0;

      try {
        const rankStats = await riotAPI.getRankedStatsByPuuid(
          accountData.puuid,
          region,
        );
        // Prioritize Solo/Duo, then Flex
        const soloDuo = rankStats.find(
          (e) => e.queueType === "RANKED_SOLO_5x5",
        );
        const flex = rankStats.find(
          (e) =>
            e.queueType === "RANKED_FLEX_SR" ||
            e.queueType === "RANKED_FLEX_5x5",
        );
        const mainStat = soloDuo || flex;

        if (mainStat) {
          rankString = `${mainStat.tier} ${mainStat.rank}`;
          tier = mainStat.tier;
          lp = mainStat.leaguePoints;
        }
      } catch (err) {
        console.log(
          `[WARN] Could not fetch rank for ${gameName}: ${err.message}`,
        );
        // Continue without failing, just set as Unranked
      }

      // 3. Update/Save to DB
      await lolAccountSchema.findOneAndUpdate(
        { userId: interaction.user.id },
        {
          userId: interaction.user.id,
          gameName: accountData.gameName,
          tagLine: accountData.tagLine,
          region: region,
          puuid: accountData.puuid,
          rank: rankString,
          tier: tier,
          lp: lp,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true },
      );

      // 4. Update Nickname: "Discord Name | Rank"
      const discordName = interaction.user.globalName || interaction.user.username;
      const newNickname = `${discordName} | ${rankString}`;
      
      try {
        if (interaction.member.manageable && interaction.guild.members.me.permissions.has("ManageNicknames")) {
           // Check if owner (cannot change owner nick)
           if (interaction.user.id !== interaction.guild.ownerId) {
             await interaction.member.setNickname(newNickname.substring(0, 32)); // Discord max length 32
           }
        }
      } catch (err) {
        // console.log(`[WARN] Failed to update nickname for ${interaction.user.tag}: ${err.message}`);
      }

      // 5. Add Setup Role (General)
      if (roleId) {
        try {
          const role = interaction.guild.roles.cache.get(roleId);
          if (role && interaction.guild.members.me.permissions.has("ManageRoles") && role.editable) {
            await interaction.member.roles.add(role);
          }
        } catch (err) {
          // console.log(`[WARN] Failed to add role ${roleId}: ${err.message}`);
        }
      }

      // 6. Add Rank Role (Specific)
      const lolGuildConfigSchema = require("../../schemas/lolGuildConfigSchema");
      try {
        const guildConfig = await lolGuildConfigSchema.findOne({ guildId: interaction.guildId });
        if (guildConfig && guildConfig.rankRoles) {
           const rankRoleId = guildConfig.rankRoles.get(tier);
           if (rankRoleId) {
             const rankRole = interaction.guild.roles.cache.get(rankRoleId);
             if (rankRole && rankRole.editable) {
               await interaction.member.roles.add(rankRole);
             }
           }
        }
      } catch (e) {}

      await interaction.editReply({
        content: `✅ Compte **${accountData.gameName}#${accountData.tagLine}** lié avec succès !\nRang: ${rankString}`,
      });

      // Update Average Rank Channel immediately
      const updateAverageRankChannel = require("../../utils/updateAverageRankChannel");
      updateAverageRankChannel(client, interaction.guildId).catch(err => console.log(err));
    } catch (err) {
      console.log("[ERROR] Error in lolRegisterModal.js:", err);
      await interaction
        .editReply({
          content: "❌ Une erreur interne s'est produite.",
        })
        .catch(() => {});
    }
  },
};
