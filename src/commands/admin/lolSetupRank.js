const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require("discord.js");
const lolGuildConfigSchema = require("../../schemas/lolGuildConfigSchema");
const getAverageRank = require("../../utils/averageRankLogic");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lol_setup_rank")
    .setDescription("Crée un salon vocal affichant le rang moyen du serveur")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.Connect,
  ],

  run: async (client, interaction) => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Calculate initial rank to verify it works
      const avgRank = await getAverageRank(interaction.guildId);
      const channelName = `🏆┆ Elo Moyen: ${avgRank}`;

      // Create Voice Channel
      const channel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        permissionOverwrites: [
          {
            id: interaction.guild.id, // Everyone
            allow: [PermissionFlagsBits.ViewChannel],
            deny: [PermissionFlagsBits.Connect], // Locked
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.ManageChannels,
            ],
          },
        ],
      });

      // Save to DB
      await lolGuildConfigSchema.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          guildId: interaction.guildId,
          averageRankChannelId: channel.id,
        },
        { upsert: true },
      );

      await interaction.editReply({
        content: `✅ Salon vocal créé: **${channel.name}**\nIl sera mis à jour automatiquement toutes les heures.`,
      });
    } catch (err) {
      console.log("[ERROR] lolSetupRank:", err);
      await interaction.editReply({
        content: "❌ Une erreur s'est produite lors de la création du salon.",
      });
    }
  },
};
