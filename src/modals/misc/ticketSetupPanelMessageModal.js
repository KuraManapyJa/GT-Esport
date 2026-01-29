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
  customId: "ticket_setup_panel_message_modal",
  testMode: false,
  devOnly: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const panelMessage = interaction.fields
        .getTextInputValue("panel_message")
        .trim();

      if (!panelMessage) {
        return interaction.editReply({
          content: "`❌` Le message ne peut pas être vide.",
        });
      }

      // Mettre à jour la config
      let config = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });
      if (!config) {
        return interaction.editReply({
          content:
            "`❌` Configuration non trouvée. Recommencez avec `/setup-ticket`.",
        });
      }

      config.customPanelMessage = panelMessage;
      await config.save();

      // Continuer avec l'étape suivante
      const embed = new EmbedBuilder()
        .setTitle("🎫 Configuration du Système de Tickets")
        .setDescription(
          `✅ **Channel sélectionné :** <#${config.channelId}>\n` +
            `✅ **Catégorie sélectionnée :** <#${config.categoryId}>\n` +
            `✅ **Message du panneau :** Personnalisé\n\n` +
            `Souhaitez-vous définir un message personnalisé pour les tickets créés ?\n\n` +
            `**ℹ️ Information :**\n` +
            `Ce message sera envoyé dans chaque ticket créé, en mentionnant le créateur.\n\n` +
            `Une fois cette étape terminée, vous pourrez configurer les rôles.`,
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration des Tickets`,
        })
        .setTimestamp();

      const ticketMessageSelect = new StringSelectMenuBuilder()
        .setCustomId("ticket_setup_step4_ticket_message")
        .setPlaceholder("💬 Message personnalisé du ticket")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Oui, définir un message personnalisé")
            .setValue("yes")
            .setDescription("Ouvre un modal pour saisir le message")
            .setEmoji("✅"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Non, utiliser le message par défaut")
            .setValue("no")
            .setDescription("Utilise le message par défaut")
            .setEmoji("❌"),
        );

      embed.setDescription(
        embed.data.description +
          `\n\n🔶 **Étape actuelle :** Message personnalisé du ticket`,
      );

      const row = new ActionRowBuilder().addComponents(ticketMessageSelect);

      // Trouver le message original et le mettre à jour
      // On va utiliser une approche différente : répondre avec le nouveau message
      return interaction.editReply({
        content: "✅ Message du panneau enregistré !",
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red +
          " Error in ticketSetupPanelMessageModal.js run function:",
      );
      console.log(err);
      return interaction.editReply({
        content: mConfig.embedErrorMessage,
      });
    }
  },
};
