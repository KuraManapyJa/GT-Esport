const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  customId: "lol_reg", // Handles lol_reg_ROLEID
  userPermissions: [],
  botPermissions: [],
  run: async (client, interaction) => {
    try {
      // Extract Role ID from Button Custom ID: lol_reg_ROLEID
      const roleId = interaction.customId.split("_")[2];

      const modal = new ModalBuilder()
        .setCustomId(`lol_register_modal_${roleId}`)
        .setTitle("S'enregistrer - League of Legends");

      const gameNameInput = new TextInputBuilder()
        .setCustomId("gameName")
        .setLabel("Votre Riot ID (ex: Faker)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Pseudo")
        .setRequired(true)
        .setMaxLength(16);

      const tagLineInput = new TextInputBuilder()
        .setCustomId("tagLine")
        .setLabel("Votre Tag (ex: EUW)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("EUW") // Most common default
        .setRequired(true)
        .setMaxLength(5);
        
      const regionInput = new TextInputBuilder()
        .setCustomId("region")
        .setLabel("Région (ex: EUW, NA, KR)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("EUW")
        .setRequired(true)
        .setMaxLength(5);

      const firstActionRow = new ActionRowBuilder().addComponents(gameNameInput);
      const secondActionRow = new ActionRowBuilder().addComponents(tagLineInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(regionInput);

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

      await interaction.showModal(modal);
    } catch (err) {
      console.log("[ERROR] Error showing modal:", err);
    }
  },
};
