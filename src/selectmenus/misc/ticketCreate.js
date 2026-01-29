require("colors");

const {
  EmbedBuilder,
  PermissionOverwrites,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const ticketSchema = require("../../schemas/ticketSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "ticket_create",
  testMode: false,
  devOnly: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const categoryName = interaction.values[0];

      // Récupérer la configuration
      const config = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });
      if (!config) {
        return interaction.editReply({
          content:
            "`❌` Le système de tickets n'est pas configuré. Contactez un administrateur.",
        });
      }

      // Vérifier si l'utilisateur a déjà un ticket ouvert (non fermé)
      // On cherche uniquement les tickets qui sont explicitement non fermés
      const existingTicket = await ticketSchema.findOne({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        $or: [
          { isClosed: false },
          { isClosed: { $exists: false } }, // Pour les anciens tickets qui n'ont pas ce champ
        ],
      });

      if (existingTicket) {
        const existingChannel = interaction.guild.channels.cache.get(
          existingTicket.channelId,
        );
        if (existingChannel) {
          return interaction.editReply({
            content: `❌ Vous avez déjà un ticket ouvert : ${existingChannel}`,
          });
        } else {
          // Le channel n'existe plus mais le ticket est toujours marqué comme ouvert
          // On le marque comme fermé pour permettre la création d'un nouveau ticket
          existingTicket.isClosed = true;
          existingTicket.closedAt = new Date();
          await existingTicket.save();
        }
      }

      // Récupérer la catégorie
      const category = interaction.guild.channels.cache.get(config.categoryId);
      if (!category || category.type !== ChannelType.GuildCategory) {
        return interaction.editReply({
          content:
            "`❌` La catégorie configurée n'existe plus. Contactez un administrateur.",
        });
      }

      // Créer le channel du ticket
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
            ],
          },
          // Ajouter les rôles support
          ...config.supportRoles.map((roleId) => ({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          })),
        ],
      });

      // Créer l'embed du ticket
      const ticketMessage =
        config.customTicketMessage ||
        `Bonjour ${interaction.user} !\n\n` +
          `Un membre du staff va s'occuper de votre ticket sous peu.\n` +
          `Merci de patienter.`;

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 Ticket - ${categoryName}`)
        .setDescription(ticketMessage)
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setFooter({
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
          text: `${interaction.user.tag} | Ticket`,
        })
        .setTimestamp();

      // Créer les boutons
      const {
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
      } = require("discord.js");

      const claimButton = new ButtonBuilder()
        .setCustomId(`ticket_claim_${interaction.user.id}`)
        .setLabel("Prendre le ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("👤");

      const lockButton = new ButtonBuilder()
        .setCustomId(`ticket_lock_${interaction.user.id}`)
        .setLabel("Verrouiller")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔒");

      const closeButton = new ButtonBuilder()
        .setCustomId(`ticket_close_${interaction.user.id}`)
        .setLabel("Fermer")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒");

      const row = new ActionRowBuilder().addComponents(
        claimButton,
        lockButton,
        closeButton,
      );

      // Mentionner les rôles
      const mentions = config.mentionedRoles
        .map((roleId) => `<@&${roleId}>`)
        .join(" ");

      const ticketMessageObj = await ticketChannel.send({
        content: mentions
          ? `${interaction.user} ${mentions}`
          : `${interaction.user}`,
        embeds: [ticketEmbed],
        components: [row],
      });

      // Créer l'entrée dans la base de données
      await ticketSchema.create({
        guildId: interaction.guild.id,
        channelId: ticketChannel.id,
        userId: interaction.user.id,
        category: categoryName,
        claimedBy: null,
        isLocked: false,
        isClosed: false,
        messages: [],
      });

      return interaction.editReply({
        content: `✅ Votre ticket a été créé : ${ticketChannel}`,
      });
    } catch (err) {
      console.log("[ERROR]".red + " Error in ticketCreate.js run function:");
      console.log(err);
      return interaction.editReply({
        content: mConfig.embedErrorMessage,
      });
    }
  },
};
