require("colors");
const { removePlayerFromQueue } = require("../../utils/queueManager");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "queue_leave",
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

      const result = await removePlayerFromQueue(client, interaction, gameId);

      if (result.error) {
        return await interaction.editReply({
          content: `❌ ${result.error}`,
        });
      }

      await interaction.editReply({
        content: "✅ Vous avez quitté la queue.",
      });
    } catch (error) {
      console.error("[ERROR]".red + " Erreur dans leaveQueue:", error);
      await interaction.editReply({
        content: mConfig.embedErrorMessage,
      }).catch(() => {});
    }
  },
};
