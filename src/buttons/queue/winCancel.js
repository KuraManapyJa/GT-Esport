require("colors");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "win_cancel",
  testMode: false,
  devOnly: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.update({
        content: "❌ Confirmation annulée.",
        embeds: [],
        components: [],
      });
    } catch (error) {
      console.error("[ERROR]".red + " Erreur dans winCancel:", error);
      await interaction
        .reply({
          content: mConfig.embedErrorMessage,
          ephemeral: true,
        })
        .catch(() => {});
    }
  },
};
