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
  customId: "ticket_setup_step7_logs_channel",
  testMode: false,
  devOnly: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferUpdate();

      const logsChannelId = interaction.values[0];
      const logsChannel = interaction.guild.channels.cache.get(logsChannelId);

      if (!logsChannel) {
        return interaction.followUp({
          content: "`❌` Channel introuvable.",
          ephemeral: true,
        });
      }

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

      config.logsChannelId = logsChannelId;
      await config.save();

      // Étape 8 : Catégories de tickets
      const embed = new EmbedBuilder()
        .setTitle("🎫 Configuration du Système de Tickets")
        .setDescription(
          `✅ **Channel sélectionné :** <#${config.channelId}>\n` +
            `✅ **Catégorie sélectionnée :** <#${config.categoryId}>\n` +
            `✅ **Message du panneau :** ${config.customPanelMessage ? "Personnalisé" : "Par défaut"}\n` +
            `✅ **Message du ticket :** ${config.customTicketMessage ? "Personnalisé" : "Par défaut"}\n` +
            `✅ **Rôles mentionnés :** ${config.mentionedRoles.length > 0 ? config.mentionedRoles.map((id) => `<@&${id}>`).join(", ") : "Aucun"}\n` +
            `✅ **Rôles support :** ${config.supportRoles.length > 0 ? config.supportRoles.map((id) => `<@&${id}>`).join(", ") : "Aucun"}\n` +
            `✅ **Channel des logs :** ${logsChannel}\n\n` +
            `Souhaitez-vous ajouter des catégories de tickets personnalisées ?\n\n` +
            `**ℹ️ Information :**\n` +
            `Les catégories permettront aux membres de choisir le type de ticket qu'ils souhaitent créer.\n\n` +
            `Si vous choisissez "Non", une catégorie par défaut "Support" sera utilisée.`,
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
            .setLabel("Oui, ajouter des catégories")
            .setValue("add")
            .setDescription("Ouvre un modal pour ajouter une catégorie")
            .setEmoji("➕"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Non, utiliser la catégorie par défaut")
            .setValue("skip")
            .setDescription("Utilise la catégorie par défaut 'Support'")
            .setEmoji("⏭️"),
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

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red +
          " Error in ticketSetupStep7LogsChannel.js run function:",
      );
      console.log(err);
    }
  },
};
