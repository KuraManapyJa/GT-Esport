require("colors");

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const ticketSchema = require("../../schemas/ticketSchema");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add_membre")
    .setDescription("Ajouter un membre à un ticket (Staff uniquement).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addUserOption((option) =>
      option
        .setName("membre")
        .setDescription("Le membre à ajouter au ticket")
        .setRequired(true),
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

      if (!targetMember) {
        return interaction.reply({
          content: "`❌` Membre introuvable.",
          ephemeral: true,
        });
      }

      // Vérifier que c'est un ticket
      const ticket = await ticketSchema.findOne({
        channelId: interaction.channel.id,
        isClosed: false,
      });

      if (!ticket) {
        return interaction.reply({
          content:
            "`❌` Cette commande ne peut être utilisée que dans un ticket.",
          ephemeral: true,
        });
      }

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
            "`❌` Seuls les membres du staff peuvent ajouter des membres à un ticket.",
          ephemeral: true,
        });
      }

      // Ajouter le membre au ticket
      await interaction.channel.permissionOverwrites.edit(targetMember.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Membre Ajouté")
        .setDescription(
          `${targetMember} a été ajouté au ticket par ${interaction.user}.`,
        )
        .setColor(`#${mConfig.embedColorSuccess}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Ticket`,
        })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.log("[ERROR]".red + " Error in addMembre.js run function:");
      console.log(err);
      return interaction.reply({
        content: mConfig.embedErrorMessage,
        ephemeral: true,
      });
    }
  },
};
