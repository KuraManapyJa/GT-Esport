require("colors");

const {
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "test_channel_select",
  testMode: false,
  devOnly: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      // Pour ChannelSelectMenu, interaction.values contient les IDs des channels
      const selectedChannelId = interaction.values[0];

      const channel =
        interaction.guild.channels.cache.get(selectedChannelId) ||
        (await interaction.guild.channels
          .fetch(selectedChannelId)
          .catch(() => null));

      if (!channel) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription("❌ Channel introuvable.");

        return interaction.update({
          embeds: [errorEmbed],
          components: [],
        });
      }

      // Vérifier si le bot peut envoyer des messages dans ce channel
      if (
        !channel
          .permissionsFor(interaction.guild.members.me)
          ?.has("SendMessages")
      ) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription(
            "❌ Je n'ai pas la permission d'envoyer des messages dans ce channel.",
          );

        return interaction.update({
          embeds: [errorEmbed],
          components: [],
        });
      }

      // Récupérer la catégorie du channel
      const category = channel.parent ? channel.parent.name : "Sans catégorie";
      const categoryMention = channel.parent
        ? `${channel.parent}`
        : "Sans catégorie";

      // Créer l'embed de confirmation
      const confirmationEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorIncolor || "313338")
        .setTitle("⚔️ Création d'une partie: Confirmation")
        .setDescription("Veuillez confirmer votre choix de channel.")
        .addFields(
          {
            name: "📝 Channel sélectionné",
            value: `${channel} (#${channel.name})`,
            inline: false,
          },
          {
            name: "🆔 ID du channel",
            value: `\`${channel.id}\``,
            inline: true,
          },
          {
            name: "📁 Catégorie",
            value: `${categoryMention} (${category})`,
            inline: true,
          },
        )
        .setFooter({ text: mConfig.footerText || "Example Texte" });

      // Créer les boutons de confirmation
      const confirmButton = new ButtonBuilder()
        .setCustomId(`test_confirm_${channel.id}`)
        .setLabel("Confirmer")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅");

      const backButton = new ButtonBuilder()
        .setCustomId("test_back_select")
        .setLabel("Retour")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⬅️");

      const buttonRow = new ActionRowBuilder().addComponents([
        backButton,
        confirmButton,
      ]);

      // Mettre à jour le message avec l'embed de confirmation et les boutons
      await interaction.update({
        embeds: [confirmationEmbed],
        components: [buttonRow],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red + "Error in your testChannelSelect.js run function:",
      );
      console.log(err);
      console.log("[ERROR] Stack:", err.stack);

      const errorEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorError)
        .setDescription(
          mConfig.embedErrorMessage || "❌ Une erreur s'est produite !",
        );

      try {
        // Essayer de mettre à jour l'interaction
        if (!interaction.replied && !interaction.deferred) {
          await interaction.update({
            embeds: [errorEmbed],
            components: [],
          });
        } else if (interaction.deferred) {
          await interaction.editReply({
            embeds: [errorEmbed],
            components: [],
          });
        } else {
          await interaction.followUp({
            embeds: [errorEmbed],
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (updateErr) {
        console.log(
          "[ERROR]".red + "Erreur lors de la mise à jour:",
          updateErr,
        );
        // Si l'update échoue, essayer un followUp
        try {
          await interaction.followUp({
            embeds: [errorEmbed],
            flags: MessageFlags.Ephemeral,
          });
        } catch (followUpErr) {
          console.log("[ERROR]".red + "Could not send error message to user");
        }
      }
    }
  },
};
