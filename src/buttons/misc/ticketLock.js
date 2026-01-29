require("colors");

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const ticketSchema = require("../../schemas/ticketSchema");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "ticket_lock",
  testMode: false,
  devOnly: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      // Extraire l'ID utilisateur du customId
      const userId = interaction.customId.split("_")[2];

      // Vérifier que c'est un membre du staff
      const config = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });
      if (!config) {
        return interaction.reply({
          content: "`❌` Configuration non trouvée.",
          ephemeral: true,
        });
      }

      const isStaff =
        interaction.member.roles.cache.some((role) =>
          config.supportRoles.includes(role.id),
        ) ||
        interaction.member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isStaff) {
        return interaction.reply({
          content:
            "`❌` Seuls les membres du staff peuvent verrouiller un ticket.",
          ephemeral: true,
        });
      }

      // Récupérer le ticket
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

      // Toggle le verrouillage
      ticket.isLocked = !ticket.isLocked;
      await ticket.save();

      // Modifier les permissions du channel
      const channel = interaction.channel;
      const ticketUser = await interaction.guild.members.fetch(userId);

      if (ticket.isLocked) {
        // Verrouiller : retirer la permission d'envoyer des messages au créateur
        await channel.permissionOverwrites.edit(ticketUser.id, {
          SendMessages: false,
        });

        // Mettre à jour le bouton
        const {
          ActionRowBuilder,
          ButtonBuilder,
          ButtonStyle,
        } = require("discord.js");
        const claimButton = new ButtonBuilder()
          .setCustomId(`ticket_claim_${userId}`)
          .setLabel("Prendre le ticket")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("👤")
          .setDisabled(
            ticket.claimedBy !== null &&
              ticket.claimedBy !== interaction.user.id,
          );

        const lockButton = new ButtonBuilder()
          .setCustomId(`ticket_lock_${userId}`)
          .setLabel("Déverrouiller")
          .setStyle(ButtonStyle.Success)
          .setEmoji("🔓");

        const closeButton = new ButtonBuilder()
          .setCustomId(`ticket_close_${userId}`)
          .setLabel("Fermer")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒");

        const row = new ActionRowBuilder().addComponents(
          claimButton,
          lockButton,
          closeButton,
        );

        await interaction.message.edit({
          components: [row],
        });

        return interaction.reply({
          content: `🔒 Le ticket a été verrouillé par ${interaction.user}.`,
        });
      } else {
        // Déverrouiller : remettre la permission
        await channel.permissionOverwrites.edit(ticketUser.id, {
          SendMessages: true,
        });

        // Mettre à jour le bouton
        const {
          ActionRowBuilder,
          ButtonBuilder,
          ButtonStyle,
        } = require("discord.js");
        const claimButton = new ButtonBuilder()
          .setCustomId(`ticket_claim_${userId}`)
          .setLabel("Prendre le ticket")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("👤")
          .setDisabled(
            ticket.claimedBy !== null &&
              ticket.claimedBy !== interaction.user.id,
          );

        const lockButton = new ButtonBuilder()
          .setCustomId(`ticket_lock_${userId}`)
          .setLabel("Verrouiller")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🔒");

        const closeButton = new ButtonBuilder()
          .setCustomId(`ticket_close_${userId}`)
          .setLabel("Fermer")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒");

        const row = new ActionRowBuilder().addComponents(
          claimButton,
          lockButton,
          closeButton,
        );

        await interaction.message.edit({
          components: [row],
        });

        return interaction.reply({
          content: `🔓 Le ticket a été déverrouillé par ${interaction.user}.`,
        });
      }
    } catch (err) {
      console.log("[ERROR]".red + " Error in ticketLock.js run function:");
      console.log(err);
      return interaction.reply({
        content: mConfig.embedErrorMessage,
        ephemeral: true,
      });
    }
  },
};
