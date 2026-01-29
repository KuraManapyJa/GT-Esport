require("colors");

const { EmbedBuilder, ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags } = require("discord.js");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "test_back_select",
  testMode: false,
  devOnly: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      // Recréer l'embed original
      const embed = new EmbedBuilder()
        .setColor(mConfig.embedColorIncolor || "313338")
        .setTitle("⚔️ Création d'une partie: Profil de jeu")
        .setDescription("Veuillez sélectionner un channel où envoyer le message de test.")
        .addFields(
          {
            name: "📄 Instructions",
            value: "Sélectionnez un channel textuel dans le menu déroulant ci-dessous.",
            inline: false
          },
          {
            name: "ℹ️ Information",
            value: "Une fois le channel sélectionné, le message \"Ceci est un test\" sera envoyé dans le channel choisi.",
            inline: false
          }
        )
        .setFooter({ text: mConfig.footerText || "Example Texte" });

      // Recréer le select menu
      const selectMenu = new ChannelSelectMenuBuilder()
        .setCustomId("test_channel_select")
        .setPlaceholder("Sélectionnez un channel (tapez pour rechercher)")
        .setChannelTypes(ChannelType.GuildText);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      // Mettre à jour le message avec le select menu original
      await interaction.update({
        embeds: [embed],
        components: [row]
      });

    } catch (err) {
      console.log("[ERROR]".red + "Error in your testBackSelect.js run function:");
      console.log(err);
      console.log("[ERROR] Stack:", err.stack);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorError)
        .setDescription(mConfig.embedErrorMessage || "❌ Une erreur s'est produite !");
      
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.update({ 
            embeds: [errorEmbed], 
            components: [] 
          });
        } else if (interaction.deferred) {
          await interaction.editReply({ 
            embeds: [errorEmbed],
            components: []
          });
        } else {
          await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
      } catch (updateErr) {
        console.log("[ERROR]".red + "Erreur lors de la mise à jour:", updateErr);
        try {
          await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        } catch (followUpErr) {
          console.log("[ERROR]".red + "Could not send error message to user");
        }
      }
    };
  }
};
