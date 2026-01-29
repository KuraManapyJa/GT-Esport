require("colors");

const { EmbedBuilder } = require("discord.js");
const mConfig = require("../../messageConfig.json");
const lolAccountSchema = require("../../schemas/lolAccountSchema");
const RiotAPI = require("../../utils/riotAPI");
const updateRank = require("../../utils/rankUpdater");
const updateAverageRankChannel = require("../../utils/updateAverageRankChannel");

module.exports = {
  customId: "lol_link_confirm_",
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      // Extraire les données du customId: lol_link_confirm_GameName_TagLine_Region
      const customIdData = interaction.customId.replace("lol_link_confirm_", "");
      const parts = customIdData.split("_");
      const region = parts.pop(); // Dernier élément = région
      const tagLine = parts.pop(); // Avant-dernier = tag
      const gameName = parts.join("_"); // Le reste = nom

      const apiKey = process.env.RIOT_API_KEY;

      if (!apiKey) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription(
            "❌ La clé API Riot Games n'est pas configurée. Contactez un administrateur.",
          );

        return interaction.update({
          embeds: [errorEmbed],
          components: [],
        });
      }

      await interaction.deferUpdate();

      // Récupérer les données du compte pour avoir le PUUID et summonerId
      const riotAPI = new RiotAPI(apiKey);
      let accountData;
      let summonerData;

      try {
        console.log(`[LOL_LINK] Recherche du compte: ${gameName}#${tagLine} (${region})`);
        accountData = await riotAPI.getAccountByRiotId(gameName, tagLine, region);
        console.log(`[LOL_LINK] Compte trouvé, PUUID: ${accountData.puuid}`);
        
        summonerData = await riotAPI.getSummonerByPuuid(accountData.puuid, region);
        console.log(`[LOL_LINK] Summoner trouvé, ID: ${summonerData?.id}, Level: ${summonerData?.summonerLevel}`);
      } catch (error) {
        console.log(`[LOL_LINK] Erreur API: ${error.message}`);
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription(
            `❌ Erreur lors de la vérification du compte : ${error.message}`,
          );

        return interaction.editReply({
          embeds: [errorEmbed],
          components: [],
        });
      }

      // Vérifier que les données sont complètes
      if (!accountData?.puuid) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription(
            "❌ Impossible de récupérer le PUUID du compte. Vérifiez votre Riot ID.",
          );
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
      }

      // Le summonerId peut être null si l'API ne le retourne plus
      const summonerId = summonerData?.id || null;
      if (!summonerId) {
        console.log(`[LOL_LINK] ⚠️ summonerId non disponible (API Riot a changé), sauvegarde avec PUUID uniquement`);
      }

      // Sauvegarder dans la base de données
      console.log(`[LOL_LINK] Sauvegarde: userId=${interaction.user.id}, summonerId=${summonerId}, puuid=${accountData.puuid}`);
      await lolAccountSchema.findOneAndUpdate(
        { userId: interaction.user.id },
        {
          $set: {
            userId: interaction.user.id,
            gameName: accountData.gameName,
            tagLine: accountData.tagLine,
            summonerName: accountData.gameName,
            region: region,
            puuid: accountData.puuid,
            summonerId: summonerId,
            summonerLevel: summonerData?.summonerLevel || null,
            profileIconId: summonerData?.profileIconId || null,
            lastUpdated: new Date(),
          },
        },
        { upsert: true, new: true },
      );
      console.log(`[LOL_LINK] Compte sauvegardé avec succès!`);

      // Mettre à jour instantanément le rang + pseudo Discord via le même système que le check périodique
      try {
        console.log("[LOL_LINK] Mise à jour immédiate du rang et du pseudo...");
        await updateRank(client, interaction.user.id);
      } catch (e) {
        console.log(
          `[LOL_LINK] Erreur lors de la mise à jour du rang / pseudo: ${e.message}`,
        );
      }

      // Mettre à jour instantanément le canal d'elo moyen pour ce serveur (si configuré)
      try {
        if (interaction.guild) {
          console.log(
            `[LOL_LINK] Mise à jour immédiate du canal d'elo moyen pour le serveur ${interaction.guild.id}...`,
          );
          await updateAverageRankChannel(client, interaction.guild.id);
        }
      } catch (e) {
        console.log(
          `[LOL_LINK] Erreur lors de la mise à jour du canal d'elo moyen: ${e.message}`,
        );
      }

      // Mapper la région pour l'affichage
      const regionNames = {
        euw1: "Europe West (EUW)",
        eun1: "Europe Nordic & East (EUNE)",
        na1: "North America (NA)",
        kr: "Korea (KR)",
        jp1: "Japan (JP)",
        br1: "Brazil (BR)",
        la1: "Latin America North (LAN)",
        la2: "Latin America South (LAS)",
        oc1: "Oceania (OCE)",
        tr1: "Turkey (TR)",
        ru: "Russia (RU)",
      };

      const successEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorSuccess || "16c60c")
        .setTitle("✅ Compte lié avec succès!")
        .setDescription(
          `Votre compte a été lié à votre profil Discord.`,
        )
        .addFields(
          {
            name: "🎮 Riot ID",
            value: `**${accountData.gameName}#${accountData.tagLine}**`,
            inline: true,
          },
          {
            name: "🌍 Région",
            value: regionNames[region] || region.toUpperCase(),
            inline: true,
          },
          {
            name: "🎚️ Niveau",
            value: summonerData?.summonerLevel ? `${summonerData.summonerLevel}` : "N/A",
            inline: true,
          },
          {
            name: "📊 Utilisation",
            value: "Utilisez `/lol_stats` pour voir vos statistiques!",
            inline: false,
          },
        )
        .setFooter({ text: mConfig.footerText || "Example Texte" });

      await interaction.editReply({
        embeds: [successEmbed],
        components: [],
      });
    } catch (err) {
      console.log("[ERROR]".red + " Error in lolLinkConfirm.js run function:");
      console.log(err);

      const errorEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorError)
        .setDescription(
          mConfig.embedErrorMessage || "❌ Une erreur s'est produite !",
        );

      try {
        if (interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed], components: [] });
        } else {
          await interaction.update({ embeds: [errorEmbed], components: [] });
        }
      } catch (e) {
        console.log("[ERROR]".red + " Failed to send error message:", e.message);
      }
    }
  },
};
