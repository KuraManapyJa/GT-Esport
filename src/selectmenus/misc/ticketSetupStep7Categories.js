require("colors");

const {
  EmbedBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");
const { createTicketPanel } = require("./ticketSetupCategories");

module.exports = {
  customId: "ticket_setup_step8_categories",
  testMode: false,
  devOnly: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      const selectedValue = interaction.values[0];

      if (selectedValue === "add") {
        // Ouvrir un modal pour ajouter une catégorie
        const modal = new ModalBuilder()
          .setCustomId("ticket_setup_add_category_modal_step8")
          .setTitle("Ajouter une catégorie de ticket");

        const nameInput = new TextInputBuilder()
          .setCustomId("category_name")
          .setLabel("Nom de la catégorie")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ex: Support, Bug, Suggestion...")
          .setRequired(true)
          .setMaxLength(50);

        const descriptionInput = new TextInputBuilder()
          .setCustomId("category_description")
          .setLabel("Description")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Description de la catégorie")
          .setRequired(true)
          .setMaxLength(100);

        const emojiInput = new TextInputBuilder()
          .setCustomId("category_emoji")
          .setLabel("Emoji (optionnel)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("🎫")
          .setRequired(false)
          .setMaxLength(10);

        const row1 = new ActionRowBuilder().addComponents(nameInput);
        const row2 = new ActionRowBuilder().addComponents(descriptionInput);
        const row3 = new ActionRowBuilder().addComponents(emojiInput);

        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
      } else if (selectedValue === "skip") {
        // Passer à la finalisation
        await interaction.deferUpdate();

        let config = await ticketConfigSchema.findOne({
          guildId: interaction.guild.id,
        });
        if (!config) {
          return interaction.followUp({
            content: "`❌` Configuration non trouvée.",
            ephemeral: true,
          });
        }

        // Finaliser la configuration
        await createTicketPanel(client, interaction.guild, config);

        const embed = new EmbedBuilder()
          .setTitle("✅ Configuration Terminée")
          .setDescription(
            `Le système de tickets a été configuré avec succès !\n\n` +
              `**Résumé de la configuration :**\n` +
              `• Channel du panneau : <#${config.channelId}>\n` +
              `• Catégorie : <#${config.categoryId}>\n` +
              `• Message du panneau : ${config.customPanelMessage ? "Personnalisé" : "Par défaut"}\n` +
              `• Message du ticket : ${config.customTicketMessage ? "Personnalisé" : "Par défaut"}\n` +
              `• Rôles mentionnés : ${config.mentionedRoles.length > 0 ? config.mentionedRoles.map((id) => `<@&${id}>`).join(", ") : "Aucun"}\n` +
              `• Rôles support : ${config.supportRoles.length > 0 ? config.supportRoles.map((id) => `<@&${id}>`).join(", ") : "Aucun"}\n` +
              `• Channel des logs : ${config.logsChannelId ? `<#${config.logsChannelId}>` : "Non configuré"}\n` +
              `• Catégories : Par défaut (Support)\n\n` +
              `Le panneau de création de tickets a été créé dans le channel configuré.`,
          )
          .setColor(`#${mConfig.embedColorSuccess}`)
          .setFooter({
            iconURL: client.user.displayAvatarURL({ dynamic: true }),
            text: `${client.user.username} | Configuration des Tickets`,
          })
          .setTimestamp();

        await interaction.editReply({
          embeds: [embed],
          components: [],
        });

        return interaction.followUp({
          content:
            "✅ Configuration terminée ! Le panneau de tickets a été créé.",
          ephemeral: true,
        });
      } else if (selectedValue === "finish") {
        // Finaliser la configuration
        await interaction.deferUpdate();

        let config = await ticketConfigSchema.findOne({
          guildId: interaction.guild.id,
        });
        if (!config) {
          return interaction.followUp({
            content: "`❌` Configuration non trouvée.",
            ephemeral: true,
          });
        }

        // Finaliser la configuration
        await createTicketPanel(client, interaction.guild, config);

        const embed = new EmbedBuilder()
          .setTitle("✅ Configuration Terminée")
          .setDescription(
            `Le système de tickets a été configuré avec succès !\n\n` +
              `**Résumé de la configuration :**\n` +
              `• Channel du panneau : <#${config.channelId}>\n` +
              `• Catégorie : <#${config.categoryId}>\n` +
              `• Message du panneau : ${config.customPanelMessage ? "Personnalisé" : "Par défaut"}\n` +
              `• Message du ticket : ${config.customTicketMessage ? "Personnalisé" : "Par défaut"}\n` +
              `• Rôles mentionnés : ${config.mentionedRoles.length > 0 ? config.mentionedRoles.map((id) => `<@&${id}>`).join(", ") : "Aucun"}\n` +
              `• Rôles support : ${config.supportRoles.length > 0 ? config.supportRoles.map((id) => `<@&${id}>`).join(", ") : "Aucun"}\n` +
              `• Channel des logs : ${config.logsChannelId ? `<#${config.logsChannelId}>` : "Non configuré"}\n` +
              `• Catégories : ${config.ticketCategories && config.ticketCategories.length > 0 ? config.ticketCategories.map((cat) => cat.name).join(", ") : "Par défaut (Support)"}\n\n` +
              `Le panneau de création de tickets a été créé dans le channel configuré.`,
          )
          .setColor(`#${mConfig.embedColorSuccess}`)
          .setFooter({
            iconURL: client.user.displayAvatarURL({ dynamic: true }),
            text: `${client.user.username} | Configuration des Tickets`,
          })
          .setTimestamp();

        await interaction.editReply({
          embeds: [embed],
          components: [],
        });

        return interaction.followUp({
          content:
            "✅ Configuration terminée ! Le panneau de tickets a été créé.",
          ephemeral: true,
        });
      }
    } catch (err) {
      console.log(
        "[ERROR]".red + " Error in ticketSetupStep7Categories.js run function:",
      );
      console.log(err);
    }
  },
};
