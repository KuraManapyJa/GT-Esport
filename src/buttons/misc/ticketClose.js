require("colors");

const {
  EmbedBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const ticketSchema = require("../../schemas/ticketSchema");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");
const fs = require("fs");
const path = require("path");

module.exports = {
  customId: "ticket_close",
  testMode: false,
  devOnly: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      // Extraire l'ID utilisateur du customId
      const userId = interaction.customId.split("_")[2];

      // Vérifier que c'est un membre du staff ou le créateur du ticket
      const config = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });
      if (!config) {
        return interaction.reply({
          content: "`❌` Configuration non trouvée.",
          ephemeral: true,
        });
      }

      const ticket = await ticketSchema.findOne({
        channelId: interaction.channel.id,
        isClosed: false,
      });

      if (!ticket) {
        return interaction.reply({
          content: "`❌` Ticket non trouvé.",
          ephemeral: true,
        });
      }

      const isStaff =
        interaction.member.roles.cache.some((role) =>
          config.supportRoles.includes(role.id),
        ) ||
        interaction.member.permissions.has(PermissionFlagsBits.Administrator);

      const isCreator = ticket.userId === interaction.user.id;

      if (!isStaff && !isCreator) {
        return interaction.reply({
          content:
            "`❌` Seuls le créateur du ticket ou un membre du staff peuvent fermer un ticket.",
          ephemeral: true,
        });
      }

      // Ouvrir un modal de confirmation
      const modal = new ModalBuilder()
        .setCustomId(`ticket_close_confirm_${userId}`)
        .setTitle("Confirmer la fermeture du ticket");

      const reasonInput = new TextInputBuilder()
        .setCustomId("close_reason")
        .setLabel("Raison de la fermeture (optionnel)")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Pourquoi fermez-vous ce ticket ?")
        .setRequired(false)
        .setMaxLength(500);

      const row = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
    } catch (err) {
      console.log("[ERROR]".red + " Error in ticketClose.js run function:");
      console.log(err);
      return interaction.reply({
        content: mConfig.embedErrorMessage,
        ephemeral: true,
      });
    }
  },
};
