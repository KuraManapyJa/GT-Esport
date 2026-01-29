require("colors");

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove_setup_ticket")
    .setDescription(
      "Supprime la configuration du système de tickets (Admin uniquement).",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      // Vérifier si une configuration existe
      const config = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });

      if (!config) {
        return interaction.reply({
          content:
            "`❌` Aucune configuration de tickets trouvée pour ce serveur.",
          ephemeral: true,
        });
      }

      // Récupérer le channel du panneau
      const panelChannel = interaction.guild.channels.cache.get(
        config.channelId,
      );

      // Supprimer le message du panneau si le channel existe
      if (panelChannel && config.panelMessageId) {
        try {
          const panelMessage = await panelChannel.messages
            .fetch(config.panelMessageId)
            .catch(() => null);
          if (panelMessage) {
            await panelMessage.delete();
          }
        } catch (error) {
          console.log(
            "[ERROR] Erreur lors de la suppression du message du panneau:".red,
            error,
          );
        }
      } else if (panelChannel) {
        // Fallback : chercher le message si panelMessageId n'est pas défini
        try {
          const messages = await panelChannel.messages.fetch({ limit: 100 });
          const panelMessage = messages.find((msg) => {
            if (msg.author.id !== client.user.id) return false;
            if (!msg.components || msg.components.length === 0) return false;
            const hasTicketCreateSelect = msg.components.some((row) =>
              row.components.some(
                (component) => component.customId === "ticket_create",
              ),
            );
            return hasTicketCreateSelect;
          });
          if (panelMessage) {
            await panelMessage.delete();
          }
        } catch (error) {
          console.log(
            "[ERROR] Erreur lors de la suppression du message du panneau:".red,
            error,
          );
        }
      }

      // Supprimer la configuration
      await ticketConfigSchema.findOneAndDelete({
        guildId: interaction.guild.id,
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Configuration Supprimée")
        .setDescription(
          `La configuration du système de tickets a été supprimée avec succès.\n\n` +
            `**Configuration supprimée :**\n` +
            `• Channel du panneau : <#${config.channelId}>\n` +
            `• Catégorie : <#${config.categoryId}>\n` +
            `• Channel des logs : ${config.logsChannelId ? `<#${config.logsChannelId}>` : "Non configuré"}\n` +
            `• Message du panneau : ${panelChannel ? "Supprimé" : "Channel introuvable"}\n\n` +
            `Vous pouvez utiliser \`/setup-ticket\` pour reconfigurer le système.`,
        )
        .setColor(`#${mConfig.embedColorSuccess}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Remove Setup Ticket`,
        })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (err) {
      console.log(
        "[ERROR]".red + " Error in removeSetupTicket.js run function:",
      );
      console.log(err);
      return interaction.reply({
        content: mConfig.embedErrorMessage,
        ephemeral: true,
      });
    }
  },
};
