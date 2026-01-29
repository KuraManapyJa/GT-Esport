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

module.exports = {
  customId: "ticket_setup_step3_panel_message",
  testMode: false,
  devOnly: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      const selectedValue = interaction.values[0];

      if (selectedValue === "yes") {
        // Ouvrir un modal pour le message
        const modal = new ModalBuilder()
          .setCustomId("ticket_setup_panel_message_modal")
          .setTitle("Message personnalisé du panneau");

        const messageInput = new TextInputBuilder()
          .setCustomId("panel_message")
          .setLabel("Message du panneau")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(
            "Entrez le message qui apparaîtra sur le panneau de tickets...",
          )
          .setRequired(true)
          .setMaxLength(1000);

        const row = new ActionRowBuilder().addComponents(messageInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
      } else {
        // Passer à l'étape suivante
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

        config.customPanelMessage = null;
        await config.save();

        // Étape 4 : Message personnalisé du ticket
        const embed = new EmbedBuilder()
          .setTitle("🎫 Configuration du Système de Tickets")
          .setDescription(
            `✅ **Channel sélectionné :** <#${config.channelId}>\n` +
              `✅ **Catégorie sélectionnée :** <#${config.categoryId}>\n` +
              `✅ **Message du panneau :** Par défaut\n\n` +
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

        await interaction.editReply({
          embeds: [embed],
          components: [row],
        });
      }
    } catch (err) {
      console.log(
        "[ERROR]".red +
          " Error in ticketSetupStep3PanelMessage.js run function:",
      );
      console.log(err);
    }
  },
};
