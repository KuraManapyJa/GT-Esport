require("colors");

const { EmbedBuilder, MessageFlags } = require("discord.js");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "test_confirm_",
  testMode: false,
  devOnly: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      // Extraire l'ID du channel depuis le customId (format: test_confirm_CHANNEL_ID)
      const channelId = interaction.customId.replace("test_confirm_", "");
      const channel = interaction.guild.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId).catch(() => null);

      if (!channel) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription("❌ Channel introuvable.");
        
        return interaction.update({ 
          embeds: [errorEmbed], 
          components: [] 
        });
      }

      // Vérifier si le bot peut envoyer des messages dans ce channel
      if (!channel.permissionsFor(interaction.guild.members.me)?.has("SendMessages")) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription("❌ Je n'ai pas la permission d'envoyer des messages dans ce channel.");
        
        return interaction.update({ 
          embeds: [errorEmbed], 
          components: [] 
        });
      }

      // Différer la mise à jour pour éviter le timeout
      await interaction.deferUpdate();

      // Envoyer le message dans le channel sélectionné
      await channel.send("Ceci est un test");

      // Récupérer la catégorie du channel
      const category = channel.parent ? channel.parent.name : "Sans catégorie";
      const categoryMention = channel.parent ? `${channel.parent}` : "Sans catégorie";
      
      // Créer l'embed de succès
      const successEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorSuccess || "16c60c")
        .setTitle("✅ Message envoyé avec succès!")
        .setDescription(`Le message a été envoyé dans le channel sélectionné.`)
        .addFields(
          {
            name: "📝 Channel",
            value: `${channel} (#${channel.name})`,
            inline: false
          },
          {
            name: "🆔 ID",
            value: `\`${channel.id}\``,
            inline: true
          },
          {
            name: "📁 Catégorie",
            value: `${categoryMention} (${category})`,
            inline: true
          }
        )
        .setFooter({ text: mConfig.footerText || "Example Texte" });

      await interaction.editReply({ 
        embeds: [successEmbed],
        components: [] // Retirer les boutons après confirmation
      });

    } catch (err) {
      console.log("[ERROR]".red + "Error in your testConfirmChannel.js run function:");
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
