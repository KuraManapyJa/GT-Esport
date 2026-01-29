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
  customId: "ticket_setup_add_category_modal_step8",
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

      // Remettre l'embed avec les catégories
      const embed = new EmbedBuilder()
        .setTitle("🎫 Configuration du Système de Tickets")
        .setDescription(
          `✅ **Channel sélectionné :** <#${config.channelId}>\n` +
            `✅ **Catégorie sélectionnée :** <#${config.categoryId}>\n` +
            `✅ **Message du panneau :** ${config.customPanelMessage ? "Personnalisé" : "Par défaut"}\n` +
            `✅ **Message du ticket :** ${config.customTicketMessage ? "Personnalisé" : "Par défaut"}\n` +
            `✅ **Rôles mentionnés :** ${config.mentionedRoles.length > 0 ? config.mentionedRoles.map((id) => `<@&${id}>`).join(", ") : "Aucun"}\n` +
            `✅ **Rôles support :** ${config.supportRoles.length > 0 ? config.supportRoles.map((id) => `<@&${id}>`).join(", ") : "Aucun"}\n` +
            `✅ **Catégories ajoutées :** ${config.ticketCategories.map((cat, index) => `${index + 1}. ${cat.emoji} **${cat.name}**`).join("\n")}\n\n` +
            `Souhaitez-vous ajouter une autre catégorie ou finaliser la configuration ?`,
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration des Tickets`,
        })
        .setTimestamp();

      const categoriesSelect = new StringSelectMenuBuilder()
        .setCustomId("ticket_setup_step8_categories")
        .setPlaceholder("📋 Gérer les catégories de tickets")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Ajouter une autre catégorie")
            .setValue("add")
            .setDescription("Ouvre un modal pour ajouter une catégorie")
            .setEmoji("➕"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Finaliser la configuration")
            .setValue("finish")
            .setDescription("Termine la configuration et crée le panneau")
            .setEmoji("✅"),
        );

      embed.setDescription(
        embed.data.description +
          `\n\n🔶 **Étape actuelle :** Catégories de tickets`,
      );

      const row = new ActionRowBuilder().addComponents(categoriesSelect);

      return interaction.editReply({
        content: `✅ Catégorie "${categoryName}" ajoutée avec succès !`,
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red +
          " Error in ticketSetupAddCategoryModal.js run function:",
      );
      console.log(err);
      return interaction.editReply({
        content: mConfig.embedErrorMessage,
      });
    }
  },
};
