require("colors");

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const ticketSchema = require("../../schemas/ticketSchema");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "ticket_claim",
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
          content: "`❌` Seuls les membres du staff peuvent prendre un ticket.",
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

      if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id) {
        return interaction.reply({
          content: `❌ Ce ticket est déjà pris en charge par <@${ticket.claimedBy}>.`,
          ephemeral: true,
        });
      }

      // Mettre à jour le ticket
      ticket.claimedBy = interaction.user.id;
      await ticket.save();

      // Mettre à jour l'embed
      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setDescription(
          interaction.message.embeds[0].description +
            `\n\n👤 **Ticket pris en charge par ${interaction.user}**`,
        )
        .setColor(`#${mConfig.embedColorSuccess}`);

      // Mettre à jour les boutons (désactiver le bouton "Prendre")
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
        .setDisabled(true);

      const lockButton = new ButtonBuilder()
        .setCustomId(`ticket_lock_${userId}`)
        .setLabel(ticket.isLocked ? "Déverrouiller" : "Verrouiller")
        .setStyle(ticket.isLocked ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setEmoji(ticket.isLocked ? "🔓" : "🔒");

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

      // Mentionner les autres rôles support
      const mentions = config.supportRoles
        .filter((roleId) => {
          const role = interaction.guild.roles.cache.get(roleId);
          return role && !interaction.member.roles.cache.has(roleId);
        })
        .map((roleId) => `<@&${roleId}>`)
        .join(" ");

      await interaction.message.edit({
        embeds: [updatedEmbed],
        components: [row],
      });

      if (mentions) {
        await interaction.channel.send({
          content: `${interaction.user} a pris en charge ce ticket. ${mentions}`,
        });
      }

      return interaction.reply({
        content: `✅ Vous avez pris en charge ce ticket.`,
        ephemeral: true,
      });
    } catch (err) {
      console.log("[ERROR]".red + " Error in ticketClaim.js run function:");
      console.log(err);
      return interaction.reply({
        content: mConfig.embedErrorMessage,
        ephemeral: true,
      });
    }
  },
};
