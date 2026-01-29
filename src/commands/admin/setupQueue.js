require("colors");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const QueueChannel = require("../../schemas/queueChannelSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup_queue")
    .setDescription("Configure un canal pour les queues de matchmaking")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Le canal où les queues seront créées")
        .setRequired(true)
    )
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
    .addStringOption((option) =>
      option
        .setName("region")
        .setDescription("La région pour cette queue")
        .setRequired(false)
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
      const channel = interaction.options.getChannel("channel");
      const game = interaction.options.getString("game");
      const region = interaction.options.getString("region") || "euw";

      if (channel.type !== 0) {
        return await interaction.reply({
          content: "❌ Le canal doit être un canal texte.",
          ephemeral: true,
        });
      }

      // Vérifier si le canal est déjà configuré
      const existingQueue = await QueueChannel.findOne({
        channelId: channel.id,
      });

      if (existingQueue) {
        // Mettre à jour la configuration existante
        existingQueue.game = game;
        existingQueue.region = region;
        await existingQueue.save();

        const embed = new EmbedBuilder()
          .setTitle("✅ Queue mise à jour")
          .setDescription(
            `Le canal ${channel} a été mis à jour pour le jeu **${game.toUpperCase()}** (région: ${region}).`
          )
          .setColor(`#${mConfig.embedColorIncolor}`)
          .setTimestamp();

        return await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }

      // Créer une nouvelle configuration
      await QueueChannel.create({
        channelId: channel.id,
        guildId: interaction.guild.id,
        game: game,
        region: region,
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Queue configurée")
        .setDescription(
          `Le canal ${channel} a été configuré pour les queues **${game.toUpperCase()}** (région: ${region}).\n\n` +
            `Utilisez \`/start\` dans ce canal pour démarrer une queue.`
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (err) {
      console.log("[ERROR]".red + " Error in setupQueue.js:", err);
      await interaction
        .reply({
          content: "❌ Une erreur s'est produite lors de la configuration.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  },
};
