require("colors");

const {
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
} = require("discord.js");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "ticket_setup_step1_channel",
  testMode: false,
  devOnly: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferUpdate();

      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) {
        return interaction.followUp({
          content: "`❌` Channel introuvable.",
          ephemeral: true,
        });
      }

      // Sauvegarder temporairement dans la config
      // On utilise findOneAndUpdate avec upsert pour créer ou mettre à jour
      // On met une valeur temporaire pour categoryId (sera remplacée à l'étape suivante)
      let config = await ticketConfigSchema.findOneAndUpdate(
        { guildId: interaction.guild.id },
        {
          guildId: interaction.guild.id,
          channelId: channelId,
          categoryId: interaction.guild.id, // Valeur temporaire (ID du serveur), sera remplacée à l'étape 2
          customPanelMessage: null,
          customTicketMessage: null,
          mentionedRoles: [],
          supportRoles: [],
          ticketCategories: [],
        },
        { upsert: true, new: true },
      );

      // Étape 2 : Sélection de la catégorie
      const categories = interaction.guild.channels.cache
        .filter((ch) => ch.type === ChannelType.GuildCategory)
        .sort((a, b) => a.position - b.position)
        .first(25);

      if (categories.size === 0) {
        return interaction.followUp({
          content: "`❌` Aucune catégorie trouvée sur ce serveur.",
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("🎫 Configuration du Système de Tickets")
        .setDescription(
          `✅ **Channel sélectionné :** ${channel}\n\n` +
            `Veuillez sélectionner la catégorie où les tickets seront créés.\n\n` +
            `**ℹ️ Information :**\n` +
            `Tous les tickets créés seront placés dans cette catégorie.\n\n` +
            `Une fois la catégorie sélectionnée, vous pourrez configurer les messages personnalisés.`,
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration des Tickets`,
        })
        .setTimestamp();

      const categorySelect = new StringSelectMenuBuilder()
        .setCustomId("ticket_setup_step2_category")
        .setPlaceholder("📁 Sélectionnez la catégorie pour les tickets")
        .setMinValues(1)
        .setMaxValues(1);

      categories.forEach((category) => {
        categorySelect.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(category.name)
            .setValue(category.id)
            .setDescription(`Catégorie: ${category.name}`)
            .setEmoji("📁"),
        );
      });

      embed.setDescription(
        embed.data.description +
          `\n\n🔶 **Étape actuelle :** Sélection de la catégorie`,
      );

      const row = new ActionRowBuilder().addComponents(categorySelect);

      // Pour les messages éphémères, on doit utiliser editReply au lieu de message.edit
      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red + " Error in ticketSetupStep1Channel.js run function:",
      );
      console.log(err);
    }
  },
};
