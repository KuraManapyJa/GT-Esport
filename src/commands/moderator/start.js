require("colors");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { startQueue } = require("../../utils/queueManager");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("start")
    .setDescription("Démarre une nouvelle queue de matchmaking")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Le mode de jeu pour cette queue")
        .setRequired(false)
        .addChoices(
          { name: "Mode Décontracté", value: "casual" },
          { name: "Mode Classé", value: "ranked" },
          { name: "Mode Rosters", value: "rosters" },
          { name: "Mode Capitaine", value: "captain" }
        )
    )
    .addBooleanOption((option) =>
      option
        .setName("mmr")
        .setDescription("Activer le MMR pour cette queue (par défaut: activé)")
        .setRequired(false)
    )
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [PermissionStatus.ManageChannels],
  botPermissions: [
    "SendMessages",
    "EmbedLinks",
    "ManageChannels",
    "ManageRoles",
  ],

  run: async (client, interaction) => {
    try {
      const gameMode = interaction.options.getString("mode") || null;
      const mmrEnabled = interaction.options.getBoolean("mmr") ?? null;

      const result = await startQueue(
        client,
        interaction.channel,
        interaction.user,
        gameMode,
        mmrEnabled
      );

      if (result.error) {
        return await interaction.reply({
          content: `❌ ${result.error}`,
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: "✅ Queue démarrée avec succès !",
        ephemeral: true,
      });
    } catch (err) {
      console.log("[ERROR]".red + " Error in start.js:", err);
      await interaction
        .reply({
          content: mConfig.embedErrorMessage,
          ephemeral: true,
        })
        .catch(() => {});
    }
  },
};
