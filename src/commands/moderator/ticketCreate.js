require("colors");

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const ticketSchema = require("../../schemas/ticketSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket_create")
    .setDescription("Créer un ticket pour un membre (Staff uniquement).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addUserOption((option) =>
      option
        .setName("membre")
        .setDescription("Le membre pour qui créer le ticket")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("catégorie")
        .setDescription("La catégorie du ticket")
        .setRequired(false),
    )
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      const targetMember = interaction.options.getMember("membre");
      const categoryName =
        interaction.options.getString("catégorie") || "Support";

      if (!targetMember) {
        return interaction.reply({
          content: "`❌` Membre introuvable.",
          ephemeral: true,
        });
      }

      // Vérifier que c'est un membre du staff
      const config = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });
      if (!config) {
        return interaction.reply({
          content: "`❌` Le système de tickets n'est pas configuré.",
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
            "`❌` Seuls les membres du staff peuvent créer des tickets pour d'autres membres.",
          ephemeral: true,
        });
      }

      // Vérifier si l'utilisateur a déjà un ticket ouvert (non fermé)
      // On cherche uniquement les tickets qui sont explicitement non fermés
      const existingTicket = await ticketSchema.findOne({
        userId: targetMember.id,
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
          return interaction.reply({
            content: `❌ ${targetMember} a déjà un ticket ouvert : ${existingChannel}`,
            ephemeral: true,
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
        return interaction.reply({
          content: "`❌` La catégorie configurée n'existe plus.",
          ephemeral: true,
        });
      }

      // Créer le channel du ticket
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${targetMember.user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: targetMember.id,
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
        `Bonjour ${targetMember} !\n\n` +
          `Un membre du staff a créé ce ticket pour vous.\n` +
          `Un membre du staff va s'occuper de votre ticket sous peu.`;

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 Ticket - ${categoryName}`)
        .setDescription(ticketMessage)
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setFooter({
          iconURL: targetMember.displayAvatarURL({ dynamic: true }),
          text: `${targetMember.user.tag} | Ticket créé par ${interaction.user.tag}`,
        })
        .setTimestamp();

      // Créer les boutons
      const {
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
      } = require("discord.js");

      const claimButton = new ButtonBuilder()
        .setCustomId(`ticket_claim_${targetMember.id}`)
        .setLabel("Prendre le ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("👤");

      const lockButton = new ButtonBuilder()
        .setCustomId(`ticket_lock_${targetMember.id}`)
        .setLabel("Verrouiller")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔒");

      const closeButton = new ButtonBuilder()
        .setCustomId(`ticket_close_${targetMember.id}`)
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

      await ticketChannel.send({
        content: mentions ? `${targetMember} ${mentions}` : `${targetMember}`,
        embeds: [ticketEmbed],
        components: [row],
      });

      // Créer l'entrée dans la base de données
      await ticketSchema.create({
        guildId: interaction.guild.id,
        channelId: ticketChannel.id,
        userId: targetMember.id,
        category: categoryName,
        claimedBy: null,
        isLocked: false,
        isClosed: false,
        messages: [],
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Ticket Créé")
        .setDescription(
          `Le ticket a été créé avec succès pour ${targetMember} : ${ticketChannel}`,
        )
        .setColor(`#${mConfig.embedColorSuccess}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Ticket Create`,
        })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.log("[ERROR]".red + " Error in ticketCreate.js run function:");
      console.log(err);
      return interaction.reply({
        content: mConfig.embedErrorMessage,
        ephemeral: true,
      });
    }
  },
};
