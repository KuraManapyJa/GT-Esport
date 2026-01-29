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
  customId: "ticket_setup_step2_category",
  testMode: false,
  devOnly: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferUpdate();

      const categoryId = interaction.values[0];
      const category = interaction.guild.channels.cache.get(categoryId);

      if (!category || category.type !== 4) {
        return interaction.followUp({
          content: "`❌` Catégorie introuvable.",
          ephemeral: true,
        });
      }

      // Mettre à jour la config
      let config = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });
      if (!config) {
        return interaction.followUp({
          content:
            "`❌` Configuration non trouvée. Recommencez avec `/setup-ticket`.",
          ephemeral: true,
        });
      }

      config.categoryId = categoryId;
      await config.save();

      // Étape 3 : Message personnalisé du panneau
      const embed = new EmbedBuilder()
        .setTitle("🎫 Configuration du Système de Tickets")
        .setDescription(
          `✅ **Channel sélectionné :** <#${config.channelId}>\n` +
            `✅ **Catégorie sélectionnée :** ${category.name}\n\n` +
            `Souhaitez-vous définir un message personnalisé pour le panneau de tickets ?\n\n` +
            `**ℹ️ Information :**\n` +
            `Si vous choisissez "Non", un message par défaut sera utilisé.\n\n` +
            `Une fois cette étape terminée, vous pourrez configurer le message du ticket.`,
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration des Tickets`,
        })
        .setTimestamp();

      const panelMessageSelect = new StringSelectMenuBuilder()
        .setCustomId("ticket_setup_step3_panel_message")
        .setPlaceholder("💬 Message personnalisé du panneau")
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
          `\n\n🔶 **Étape actuelle :** Message personnalisé du panneau`,
      );

      const row = new ActionRowBuilder().addComponents(panelMessageSelect);

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red + " Error in ticketSetupStep2Category.js run function:",
      );
      console.log(err);
    }
  },
};
