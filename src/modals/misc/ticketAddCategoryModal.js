require("colors");

const {
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "ticket_add_category_modal",
  testMode: false,
  devOnly: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const categoryName = interaction.fields
        .getTextInputValue("category_name")
        .trim();
      const categoryDescription = interaction.fields
        .getTextInputValue("category_description")
        .trim();
      const categoryEmoji =
        interaction.fields.getTextInputValue("category_emoji").trim() || "🎫";

      if (!categoryName || !categoryDescription) {
        return interaction.editReply({
          content: "`❌` Le nom et la description sont requis.",
        });
      }

      // Récupérer la configuration
      const config = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });
      if (!config) {
        return interaction.editReply({
          content:
            "`❌` Configuration non trouvée. Recommencez avec `/setup-ticket`.",
        });
      }

      // Ajouter la catégorie
      if (!config.ticketCategories) {
        config.ticketCategories = [];
      }

      config.ticketCategories.push({
        name: categoryName,
        description: categoryDescription,
        emoji: categoryEmoji,
      });

      await config.save();

      // Mettre à jour l'embed de configuration
      const embed = new EmbedBuilder()
        .setTitle("🎫 Configuration des Tickets - Étape 2")
        .setDescription(
          `✅ **Catégorie "${categoryName}" ajoutée !**\n\n` +
            `**Catégories configurées:**\n` +
            config.ticketCategories
              .map(
                (cat, index) =>
                  `${index + 1}. ${cat.emoji} **${cat.name}** - ${cat.description}`,
              )
              .join("\n") +
            `\n\n**Étapes suivantes :**\n` +
            `Utilisez les menus ci-dessous pour :\n` +
            `• Ajouter des rôles support\n` +
            `• Ajouter des catégories de tickets\n` +
            `• Finaliser la configuration`,
        )
        .setColor(`#${mConfig.embedColorSuccess}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Setup Ticket`,
        })
        .setTimestamp();

      // Recréer les selectmenus
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
        const isSelected = config.supportRoles.includes(role.id);
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

      return interaction.editReply({
        content: `✅ Catégorie "${categoryName}" ajoutée avec succès !`,
        embeds: [embed],
        components: [row1, row2],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red + " Error in ticketAddCategoryModal.js run function:",
      );
      console.log(err);
      return interaction.editReply({
        content: mConfig.embedErrorMessage,
      });
    }
  },
};
