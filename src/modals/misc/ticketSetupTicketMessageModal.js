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
  customId: "ticket_setup_ticket_message_modal",
  testMode: false,
  devOnly: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const ticketMessage = interaction.fields
        .getTextInputValue("ticket_message")
        .trim();

      if (!ticketMessage) {
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

      config.customTicketMessage = ticketMessage;
      await config.save();

      // Continuer avec l'étape suivante
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
            `✅ **Message du ticket :** Personnalisé\n\n` +
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

      return interaction.editReply({
        content: "✅ Message du ticket enregistré !",
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red +
          " Error in ticketSetupTicketMessageModal.js run function:",
      );
      console.log(err);
      return interaction.editReply({
        content: mConfig.embedErrorMessage,
      });
    }
  },
};
