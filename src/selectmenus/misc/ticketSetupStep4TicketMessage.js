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
  customId: "ticket_setup_step4_ticket_message",
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
          .setCustomId("ticket_setup_ticket_message_modal")
          .setTitle("Message personnalisé du ticket");

        const messageInput = new TextInputBuilder()
          .setCustomId("ticket_message")
          .setLabel("Message du ticket")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(
            "Entrez le message qui apparaîtra dans chaque ticket créé...",
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

        config.customTicketMessage = null;
        await config.save();

        // Étape 5 : Rôles mentionnés
        const roles = interaction.guild.roles.cache
          .filter((role) => !role.managed && role.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .first(25);

        const rolesArray = Array.from(roles.values());
        const maxRoles = Math.min(25, rolesArray.length);

        const embed = new EmbedBuilder()
          .setTitle("🎫 Configuration du Système de Tickets")
          .setDescription(
            `✅ **Channel sélectionné :** <#${config.channelId}>\n` +
              `✅ **Catégorie sélectionnée :** <#${config.categoryId}>\n` +
              `✅ **Message du panneau :** ${config.customPanelMessage ? "Personnalisé" : "Par défaut"}\n` +
              `✅ **Message du ticket :** Par défaut\n\n` +
              `Sélectionnez les rôles qui seront mentionnés lors de la création d'un ticket.\n\n` +
              `**ℹ️ Information :**\n` +
              `Ces rôles recevront une notification à chaque création de ticket.\n\n` +
              `Une fois cette étape terminée, vous pourrez configurer les rôles support.`,
          )
          .setColor(`#${mConfig.embedColorIncolor}`)
          .setFooter({
            iconURL: client.user.displayAvatarURL({ dynamic: true }),
            text: `${client.user.username} | Configuration des Tickets`,
          })
          .setTimestamp();

        const mentionedRolesSelect = new StringSelectMenuBuilder()
          .setCustomId("ticket_setup_step5_mentioned_roles")
          .setPlaceholder("🔔 Rôles à mentionner (optionnel)")
          .setMinValues(0)
          .setMaxValues(maxRoles > 0 ? maxRoles : 1);

        rolesArray.forEach((role) => {
          const isSelected = config.mentionedRoles.includes(role.id);
          mentionedRolesSelect.addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel(role.name)
              .setValue(role.id)
              .setDescription(`Rôle: ${role.name}`)
              .setEmoji("🔔")
              .setDefault(isSelected),
          );
        });

        embed.setDescription(
          embed.data.description +
            `\n\n🔶 **Étape actuelle :** Rôles à mentionner`,
        );

        const row = new ActionRowBuilder().addComponents(mentionedRolesSelect);

        await interaction.editReply({
          embeds: [embed],
          components: [row],
        });
      }
    } catch (err) {
      console.log(
        "[ERROR]".red +
          " Error in ticketSetupStep4TicketMessage.js run function:",
      );
      console.log(err);
    }
  },
};
