require("colors");

const {
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
} = require("discord.js");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");
const { createTicketPanel } = require("./ticketSetupCategories");

module.exports = {
  customId: "ticket_setup_step6_support_roles",
  testMode: false,
  devOnly: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferUpdate();

      const selectedRoles = interaction.values;

      // Mettre à jour la config
      let config = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });
      if (!config) {
        return interaction.followUp({
          content: "`❌` Configuration non trouvée.",
          ephemeral: true,
        });
      }

      config.supportRoles = selectedRoles;
      await config.save();

      // Étape 7 : Channel des logs
      const channels = interaction.guild.channels.cache
        .filter((channel) => channel.type === ChannelType.GuildText)
        .sort((a, b) => a.position - b.position)
        .first(25);

      if (channels.size === 0) {
        return interaction.followUp({
          content: "`❌` Aucun channel textuel trouvé sur ce serveur.",
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("🎫 Configuration du Système de Tickets")
        .setDescription(
          `✅ **Channel sélectionné :** <#${config.channelId}>\n` +
            `✅ **Catégorie sélectionnée :** <#${config.categoryId}>\n` +
            `✅ **Message du panneau :** ${config.customPanelMessage ? "Personnalisé" : "Par défaut"}\n` +
            `✅ **Message du ticket :** ${config.customTicketMessage ? "Personnalisé" : "Par défaut"}\n` +
            `✅ **Rôles mentionnés :** ${config.mentionedRoles.length > 0 ? config.mentionedRoles.map((id) => `<@&${id}>`).join(", ") : "Aucun"}\n` +
            `✅ **Rôles support :** ${selectedRoles.length > 0 ? selectedRoles.map((id) => `<@&${id}>`).join(", ") : "Aucun"}\n\n` +
            `Sélectionnez le channel où les logs des tickets fermés seront envoyés.\n\n` +
            `**ℹ️ Information :**\n` +
            `Lorsqu'un ticket sera fermé, un log complet de la conversation sera envoyé dans ce channel.\n\n` +
            `Une fois cette étape terminée, vous pourrez configurer les catégories de tickets.`,
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration des Tickets`,
        })
        .setTimestamp();

      const logsChannelSelect = new StringSelectMenuBuilder()
        .setCustomId("ticket_setup_step7_logs_channel")
        .setPlaceholder("📝 Sélectionnez le channel des logs")
        .setMinValues(1)
        .setMaxValues(1);

      const channelsArray = Array.from(channels.values());
      channelsArray.forEach((channel) => {
        logsChannelSelect.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(channel.name)
            .setValue(channel.id)
            .setDescription(`Channel: #${channel.name}`)
            .setEmoji("📝"),
        );
      });

      embed.setDescription(
        embed.data.description + `\n\n🔶 **Étape actuelle :** Channel des logs`,
      );

      const row = new ActionRowBuilder().addComponents(logsChannelSelect);

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red +
          " Error in ticketSetupStep6SupportRoles.js run function:",
      );
      console.log(err);
    }
  },
};
