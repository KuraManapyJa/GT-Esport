require("colors");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const QueueConfig = require("../../schemas/queueConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup_inhouse")
    .setDescription("Configure InHouse Queue avec création automatique des canaux")
    .addStringOption((option) =>
      option
        .setName("game")
        .setDescription("Le jeu pour cette queue")
        .setRequired(true)
        .addChoices(
          { name: "League of Legends", value: "lol" },
          { name: "Valorant", value: "valorant" },
          { name: "Autre (5v5)", value: "other" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
  ],

  run: async (client, interaction) => {
    try {
      const game = interaction.options.getString("game");
      const guild = interaction.guild;

      // Vérifier si un setup existe déjà pour ce jeu
      const existingQueue = await QueueConfig.findOne({
        guildId: guild.id,
        game: game,
      });

      if (existingQueue) {
        return await interaction.reply({
          content: `❌ Un setup existe déjà pour **${game.toUpperCase()}**. Utilisez \`/remove_setup\` pour le supprimer d'abord.`,
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      // Noms des jeux pour les catégories
      const gameNames = {
        lol: "LEAGUE OF LEGENDS",
        valorant: "VALORANT",
        other: "JEU PERSONNALISÉ",
      };

      const gameName = gameNames[game] || "CUSTOM GAME";

      // Créer la catégorie principale "INHOUSE - [GAME]"
      const mainCategory = await guild.channels.create({
        name: `🎮┆INHOUSE - ${gameName}`,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
      });

      // Créer les canaux dans la catégorie principale
      const queueChannel = await guild.channels.create({
        name: "🎮┆queue",
        type: ChannelType.GuildText,
        parent: mainCategory.id,
        topic: `Queue pour ${gameName} - Rejoignez ici pour participer aux matchs !`,
      });

      const matchHistoryChannel = await guild.channels.create({
        name: "📜┆match-history",
        type: ChannelType.GuildText,
        parent: mainCategory.id,
        topic: `Historique des matchs pour ${gameName}`,
      });

      const leaderboardChannel = await guild.channels.create({
        name: "🏆┆top-20",
        type: ChannelType.GuildText,
        parent: mainCategory.id,
        topic: `Classement Top-20 pour ${gameName}`,
      });

      const adminLogsChannel = await guild.channels.create({
        name: "🔒┆inhouse-admin-logs",
        type: ChannelType.GuildText,
        parent: mainCategory.id,
        topic: `Logs administrateurs pour ${gameName}`,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
      });

      const inProgressChannel = await guild.channels.create({
        name: "⏳┆in-progress",
        type: ChannelType.GuildText,
        parent: mainCategory.id,
        topic: `Matchs en cours pour ${gameName}`,
      });

      // Créer la catégorie "MATCHS EN COURS" (si elle n'existe pas)
      let ongoingCategory = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && (c.name === "MATCHS EN COURS" || c.name === "⏳┆MATCHS EN COURS")
      );

      if (!ongoingCategory) {
        ongoingCategory = await guild.channels.create({
          name: "⏳┆MATCHS EN COURS",
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
          ],
        });
      }

      // Sauvegarder la configuration
      await QueueConfig.create({
        queueChannelId: queueChannel.id,
        guildId: guild.id,
        game: game,
        matchHistoryChannelId: matchHistoryChannel.id,
        leaderboardChannelId: leaderboardChannel.id,
        adminLogsChannelId: adminLogsChannel.id,
        inProgressChannelId: inProgressChannel.id,
        region: game === "lol" ? "euw" : game === "valorant" ? "eu" : "none",
        gameMode: "ranked", // Par défaut en mode Ranked (peut être changé via /start)
        mmrEnabled: true, // MMR activé par défaut (peut être changé via /start)
        guildName: guild.name,
      });

      // Créer les messages automatiques dans les canaux
      const matchHistoryEmbed = new EmbedBuilder()
        .setDescription("L'historique des matchs sera publié ici !")
        .setColor(`#${mConfig.embedColorIncolor}`);
      await matchHistoryChannel.send({ embeds: [matchHistoryEmbed] });

      const leaderboardEmbed = new EmbedBuilder()
        .setTitle("🏆 Classement")
        .setDescription("Aucun enregistrement à afficher pour le moment.")
        .setColor(`#${mConfig.embedColorIncolor}`);
      await leaderboardChannel.send({ embeds: [leaderboardEmbed] });

      const inProgressEmbed = new EmbedBuilder()
        .setTitle("**Matchs en cours**")
        .setDescription(
          `Les matchs ${gameNames[game]} en cours seront affichés dans ce canal. Les membres pourront spectater en venant dans ce canal.`
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setImage("https://media.discordapp.net/attachments/1071237723857363015/1073428745253290014/esporty_banner.png");
      await inProgressChannel.send({ embeds: [inProgressEmbed] });

      // Créer un embed de succès
      const embed = new EmbedBuilder()
        .setTitle("✅ Setup InHouse Queue terminé !")
        .setDescription(
          `Le système InHouse Queue a été configuré avec succès pour **${gameName}** !\n\n` +
            `**Catégories créées :**\n` +
            `• \`🎮┆INHOUSE - ${gameName}\` (catégorie principale)\n` +
            `• \`⏳┆MATCHS EN COURS\` (pour les matchs en cours)\n\n` +
            `**Canaux créés :**\n` +
            `• ${queueChannel} - Queue principale\n` +
            `• ${matchHistoryChannel} - Historique des matchs\n` +
            `• ${leaderboardChannel} - Classement Top-20\n` +
            `• ${adminLogsChannel} - Logs administrateurs\n` +
            `• ${inProgressChannel} - Matchs en cours\n\n` +
            `**Prochaines étapes :**\n` +
            `1. Utilisez \`/start\` dans ${queueChannel} pour démarrer une queue\n` +
            `2. Les joueurs peuvent rejoindre en cliquant sur les boutons\n` +
            `3. Le système créera automatiquement les salons vocaux lors du matchmaking`
        )
        .setColor(`#${mConfig.embedColorSuccess}`)
        .setFooter({
          text: `${client.user.username} | Setup InHouse Queue`,
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });

      // Envoyer un message dans le canal queue
      const queueEmbed = new EmbedBuilder()
        .setTitle(`🎮 Queue ${gameName}`)
        .setDescription(
          `Bienvenue dans la queue InHouse pour **${gameName}** !\n\n` +
            `Utilisez \`/start\` pour démarrer une nouvelle queue.\n\n` +
            `**Comment jouer :**\n` +
            `1. Un administrateur démarre une queue avec \`/start\`\n` +
            `2. Cliquez sur "Rejoindre la queue" pour participer\n` +
            `3. Attendez que 10 joueurs rejoignent\n` +
            `4. Le système équilibrera les équipes automatiquement\n` +
            `5. Préparez-vous et commencez à jouer !`
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setTimestamp();

      await queueChannel.send({ embeds: [queueEmbed] });
    } catch (err) {
      console.log("[ERROR]".red + " Error in setupInHouse.js:", err);
      try {
        await interaction.editReply({
          content: "❌ Une erreur s'est produite lors de la configuration.",
        });
      } catch (editError) {
        await interaction.followUp({
          content: "❌ Une erreur s'est produite lors de la configuration.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
