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
    .setName("remove_membre")
    .setDescription("Retirer un membre d'un ticket (Staff uniquement).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addUserOption((option) =>
      option
        .setName("membre")
        .setDescription("Le membre à retirer du ticket")
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

      // Vérifier que ce n'est pas le créateur du ticket
      if (ticket.userId === targetMember.id) {
        return interaction.reply({
          content: "`❌` Vous ne pouvez pas retirer le créateur du ticket.",
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
            "`❌` Seuls les membres du staff peuvent retirer des membres d'un ticket.",
          ephemeral: true,
        });
      }

      // Retirer le membre du ticket
      await interaction.channel.permissionOverwrites.edit(targetMember.id, {
        ViewChannel: false,
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Membre Retiré")
        .setDescription(
          `${targetMember} a été retiré du ticket par ${interaction.user}.`,
        )
        .setColor(`#${mConfig.embedColorSuccess}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Ticket`,
        })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.log("[ERROR]".red + " Error in removeMembre.js run function:");
      console.log(err);
      return interaction.reply({
        content: mConfig.embedErrorMessage,
        ephemeral: true,
      });
    }
  },
};
