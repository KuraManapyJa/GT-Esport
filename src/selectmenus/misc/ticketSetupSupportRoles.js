require("colors");

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "ticket_setup_support_roles",
  testMode: false,
  devOnly: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferUpdate();

      const selectedRoles = interaction.values;

      // Mettre à jour la configuration
      const config = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });
      if (!config) {
        return interaction.followUp({
          content:
            "`❌` Configuration non trouvée. Recommencez avec `/setup-ticket`.",
          ephemeral: true,
        });
      }

      config.supportRoles = selectedRoles;
      await config.save();

      // Mettre à jour l'embed
      const updatedEmbed = EmbedBuilder.from(
        interaction.message.embeds[0],
      ).setDescription(
        interaction.message.embeds[0].description.split(
          "\n\n**Étapes suivantes :**",
        )[0] +
          `\n\n**Rôles support:** ${selectedRoles.length > 0 ? selectedRoles.map((id) => `<@&${id}>`).join(", ") : "Aucun"}\n\n` +
          `**Étapes suivantes :**\n` +
          `Utilisez les menus ci-dessous pour :\n` +
          `• Ajouter des rôles support\n` +
          `• Ajouter des catégories de tickets\n` +
          `• Finaliser la configuration`,
      );

      // Mettre à jour les selectmenus avec les rôles sélectionnés
      const {
        StringSelectMenuBuilder,
        ActionRowBuilder,
        StringSelectMenuOptionBuilder,
      } = require("discord.js");

      const supportRolesSelect = new StringSelectMenuBuilder()
        .setCustomId("ticket_setup_support_roles")
        .setPlaceholder("➕ Ajouter des rôles support")
        .setMinValues(0)
        .setMaxValues(25);

      const guildRoles = interaction.guild.roles.cache
        .filter((role) => !role.managed && role.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .first(25);

      guildRoles.forEach((role) => {
        const isSelected = selectedRoles.includes(role.id);
        supportRolesSelect.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(role.name)
            .setValue(role.id)
            .setDescription(`Rôle support`)
            .setDefault(isSelected),
        );
      });

      const ticketCategoriesSelect = new StringSelectMenuBuilder()
        .setCustomId("ticket_setup_categories")
        .setPlaceholder("➕ Gérer les catégories de tickets")
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Ajouter une catégorie")
            .setValue("add_category")
            .setDescription("Ouvre un modal pour ajouter une catégorie")
            .setEmoji("➕"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Finaliser la configuration")
            .setValue("finish")
            .setDescription("Termine la configuration et crée le panneau")
            .setEmoji("✅"),
        );

      const row1 = new ActionRowBuilder().addComponents(supportRolesSelect);
      const row2 = new ActionRowBuilder().addComponents(ticketCategoriesSelect);

      await interaction.editReply({
        embeds: [updatedEmbed],
        components: [row1, row2],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red + " Error in ticketSetupSupportRoles.js run function:",
      );
      console.log(err);
    }
  },
};
