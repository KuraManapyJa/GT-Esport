require("colors");

const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const lolAccountSchema = require("../../schemas/lolAccountSchema");
const RiotAPI = require("../../utils/riotAPI");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lol_stats")
    .setDescription("Affiche les statistiques League of Legends d'un membre")
    .addUserOption((option) =>
      option
        .setName("membre")
        .setDescription("Le membre dont vous voulez voir les stats")
        .setRequired(true),
    )
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      const member = interaction.options.getUser("membre");
      const apiKey = process.env.RIOT_API_KEY;

      if (!apiKey) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription(
            "❌ La clé API Riot Games n'est pas configurée. Contactez un administrateur.",
          );

        return interaction.reply({
          embeds: [errorEmbed],
        });
      }

      // Répondre immédiatement pour éviter le timeout
      await interaction.deferReply();

      // Chercher le compte LoL lié au membre Discord
      const account = await lolAccountSchema.findOne({
        userId: member.id,
      });

      if (!account) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription(
            `❌ ${member} n'a pas lié son compte League of Legends.\n\nUtilisez \`/lol_link\` pour lier votre compte.`,
          );

        return interaction.editReply({ embeds: [errorEmbed] });
      }

      // Initialiser l'API Riot
      const riotAPI = new RiotAPI(apiKey);

      // Récupérer les informations du summoner
      let summonerData;
      let puuid = account.puuid;
      let summonerId = account.summonerId;
      // Ces champs pourront être mis à jour si le joueur a changé de Riot ID
      let currentGameName = account.gameName;
      let currentTagLine = account.tagLine;

      try {
        // Toujours essayer de récupérer les données fraîches via le PUUID ou Riot ID
        if (puuid) {
          // 1) On récupère le summoner à partir du PUUID (niveau, icône, etc.)
          summonerData = await riotAPI.getSummonerByPuuid(
            puuid,
            account.region,
          );
          summonerId = summonerData?.id;

          // 2) On récupère aussi le compte Riot par PUUID pour suivre les changements de Riot ID
          const accountData = await riotAPI.getAccountByPuuid(
            puuid,
            account.region,
          );
          currentGameName = accountData.gameName;
          currentTagLine = accountData.tagLine;
        } else if (account.gameName && account.tagLine) {
          // Fallback: récupérer d'abord via Riot ID puis via PUUID
          const accountData = await riotAPI.getAccountByRiotId(
            account.gameName,
            account.tagLine,
            account.region,
          );
          puuid = accountData.puuid;
          currentGameName = accountData.gameName;
          currentTagLine = accountData.tagLine;
          summonerData = await riotAPI.getSummonerByPuuid(
            puuid,
            account.region,
          );
          summonerId = summonerData?.id;
        } else {
          throw new Error(
            "Données de compte incomplètes. Veuillez relancer /lol_link.",
          );
        }

        // Mettre à jour les données dans la base si nécessaire
        const updatePayload = {
          puuid: puuid,
          summonerId: summonerId || account.summonerId,
          summonerLevel: summonerData?.summonerLevel,
          lastUpdated: new Date(),
        };

        // Si le joueur a changé de Riot ID (gameName#tagLine), on le met aussi à jour
        if (
          currentGameName &&
          currentTagLine &&
          (currentGameName !== account.gameName ||
            currentTagLine !== account.tagLine)
        ) {
          updatePayload.gameName = currentGameName;
          updatePayload.tagLine = currentTagLine;
          updatePayload.summonerName = currentGameName;
        }

        await lolAccountSchema.updateOne(
          { userId: member.id },
          { $set: updatePayload },
        );
      } catch (error) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription(
            `❌ Erreur lors de la récupération des données : ${error.message}`,
          );

        return interaction.editReply({ embeds: [errorEmbed] });
      }

      // Récupérer les stats directement depuis l'API League-V4 via PUUID (comme dans nexus-lfg)
      let soloDuoStats = { wins: 0, losses: 0, total: 0, rank: "Non classé" };
      let flexStats = { wins: 0, losses: 0, total: 0, rank: "Non classé" };
      // Compteur des games rankeds jouées aujourd'hui
      let todayGames = { soloDuo: 0, flex: 0, total: 0 };

      try {
        const rankedEntries = await riotAPI.getRankedStatsByPuuid(
          puuid,
          account.region,
        );
        // NE PAS redéclarer todayGames (sinon on masque la variable externe et elle reste à 0)
        todayGames = await riotAPI.getTodayRankedGames(
          puuid,
          account.region,
        );

        // Séparer Solo/Duo et Flex (vérifier les deux formats possibles)
        const soloDuoEntry = rankedEntries.find(
          (e) => e.queueType === "RANKED_SOLO_5x5",
        );
        const flexEntry = rankedEntries.find(
          (e) =>
            e.queueType === "RANKED_FLEX_SR" ||
            e.queueType === "RANKED_FLEX_5x5",
        );

        const RANK_EMOJIS = {
          IRON: "<:iron:1283136044904218744>",
          BRONZE: "<:bronze:1283136039891894282>",
          SILVER: "<:silver:1283136043608047696>",
          GOLD: "<:gold:1283136038717362288>",
          PLATINUM: "<:platinum:1283136041573945414>",
          EMERALD: "<:emerald:1283142714229133353>",
          DIAMOND: "<:diamond:1283136037471785113>",
          MASTER: "<:master:1283136045952798761>",
          GRANDMASTER: "<:grandMaster:1283136048947527811>",
          CHALLENGER: "<:challenger:1283136047542177854>",
        };

        if (soloDuoEntry) {
          const emoji = RANK_EMOJIS[soloDuoEntry.tier] || "";
          soloDuoStats = {
            wins: soloDuoEntry.wins || 0,
            losses: soloDuoEntry.losses || 0,
            total: (soloDuoEntry.wins || 0) + (soloDuoEntry.losses || 0),
            rank:
              soloDuoEntry.tier && soloDuoEntry.rank
                ? `${soloDuoEntry.tier} ${soloDuoEntry.rank} ${emoji} (${soloDuoEntry.leaguePoints} LP)`
                : "Non classé",
          };
        } else {
        }

        if (flexEntry) {
          const emoji = RANK_EMOJIS[flexEntry.tier] || "";
          flexStats = {
            wins: flexEntry.wins || 0,
            losses: flexEntry.losses || 0,
            total: (flexEntry.wins || 0) + (flexEntry.losses || 0),
            rank:
              flexEntry.tier && flexEntry.rank
                ? `${flexEntry.tier} ${flexEntry.rank} ${emoji} (${flexEntry.leaguePoints} LP)`
                : "Non classé",
          };
        } else {
        }

        // Compter les games de la journée
      } catch (error) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription(
            `❌ Erreur lors de la récupération des stats: ${error.message}`,
          );
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      // Construire le Riot ID complet
      const riotId =
        currentGameName && currentTagLine
          ? `${currentGameName}#${currentTagLine}`
          : account.summonerName || "Inconnu";

      // Créer l'embed avec les stats
      const statsEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorIncolor || "313338")
        .setTitle(`⚔️ Statistiques League of Legends`)
        .setDescription(`Stats de ${member} (**${riotId}**)`);

      // Ajouter l'icône si disponible
      if (summonerData?.profileIconId) {
        statsEmbed.setThumbnail(
          `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${summonerData.profileIconId}.png`,
        );
      }

      // Calculer les winrates
      const soloDuoWinrate =
        soloDuoStats.total > 0
          ? `${((soloDuoStats.wins / soloDuoStats.total) * 100).toFixed(1)}%`
          : "N/A";
      const flexWinrate =
        flexStats.total > 0
          ? `${((flexStats.wins / flexStats.total) * 100).toFixed(1)}%`
          : "N/A";

      // Construire les valeurs de manière plus esthétique
      const soloDuoValue =
        soloDuoStats.total > 0
          ? `**${soloDuoStats.rank}**\n${soloDuoStats.wins}W / ${soloDuoStats.losses}L • ${soloDuoWinrate}\n${soloDuoStats.total} parties • ${todayGames.soloDuo} aujourd'hui`
          : "Non classé";

      const flexValue =
        flexStats.total > 0
          ? `**${flexStats.rank}**\n${flexStats.wins}W / ${flexStats.losses}L • ${flexWinrate}\n${flexStats.total} parties • ${todayGames.flex} aujourd'hui`
          : "Non classé";

      statsEmbed
        .addFields(
          {
            name: "⚔️ Solo/Duo",
            value: soloDuoValue,
            inline: true,
          },
          {
            name: "⚔️ Flex",
            value: flexValue,
            inline: true,
          },
        )
        .setFooter({
          text: mConfig.footerText || "Example Texte",
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [statsEmbed] });
    } catch (err) {
      const errorEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorError)
        .setDescription(
          mConfig.embedErrorMessage || "❌ Une erreur s'est produite !",
        );

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      } else {
        await interaction
          .reply({
            embeds: [errorEmbed],
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }
    }
  },
};
