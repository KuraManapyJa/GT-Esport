require("colors");
const { EmbedBuilder } = require("discord.js");
const { addPlayerToQueue } = require("../../utils/queueManager");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "queue_join",
  testMode: false,
  devOnly: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const customId = interaction.customId;
      const parts = customId.split("_");
      const gameId = parts[2];
      const role = parts[3] || null; // Peut être null en mode Casual

      const result = await addPlayerToQueue(client, interaction, gameId, role);

      if (result.error) {
        return await interaction.editReply({
          content: `❌ ${result.error}`,
        });
      }

      const roleText = role ? `en tant que **${role.toUpperCase()}**` : "";
      await interaction.editReply({
        content: `✅ Vous avez rejoint la queue${roleText ? " " + roleText : ""} !`,
      });
    } catch (error) {
      console.error("[ERROR]".red + " Erreur dans joinQueue:", error);
      await interaction.editReply({
        content: mConfig.embedErrorMessage,
      }).catch(() => {});
    }
  },
};
