require("colors");
const { EmbedBuilder } = require("discord.js");
const Game = require("../../schemas/gameSchema");
const GameMember = require("../../schemas/gameMemberSchema");
const { generateQueueEmbed, createQueueButtons } = require("../../utils/queueManager");
const QueueConfig = require("../../schemas/queueConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "queue_switch",
  testMode: false,
  devOnly: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const customId = interaction.customId;
      const parts = customId.split("_");
      const gameId = parts[2];

      const game = await Game.findOne({ gameId });
      if (!game) {
        return await interaction.editReply({
          content: "❌ Cette queue n'existe plus.",
        });
      }

      if (game.status !== "queue") {
        return await interaction.editReply({
          content: "❌ Vous ne pouvez plus changer d'équipe une fois le matchmaking commencé.",
        });
      }

      const member = await GameMember.findOne({
        gameId,
        userId: interaction.user.id,
      });

      if (!member) {
        return await interaction.editReply({
          content: "❌ Vous n'êtes pas dans cette queue.",
        });
      }

      // Vérifier si l'autre équipe a déjà quelqu'un avec ce rôle
      const otherTeam = member.team === "blue" ? "red" : "blue";
      const roleConflict = await GameMember.findOne({
        gameId,
        role: member.role,
        team: otherTeam,
      });

      if (roleConflict) {
        return await interaction.editReply({
          content: "❌ L'autre équipe a déjà un joueur avec ce rôle.",
        });
      }

      // Changer d'équipe
      member.team = otherTeam;
      await member.save();

      // Mettre à jour l'embed
      const queueConfig = await QueueConfig.findOne({
        queueChannelId: game.queueChannelId,
      });
      const gameMode = game.gameMode || queueConfig.gameMode || "casual";
      const mmrEnabled = game.mmrEnabled !== undefined ? game.mmrEnabled : (queueConfig.mmrEnabled ?? true);
      
      const embed = await generateQueueEmbed(
        client,
        gameId,
        queueConfig.game,
        game.guildId,
        gameMode,
        mmrEnabled
      );
      const components = createQueueButtons(
        queueConfig.game,
        gameId,
        gameMode
      );

      const channel = client.channels.cache.get(game.queueChannelId);
      const message = await channel.messages.fetch(game.queueMessageId);
      await message.edit({ embeds: [embed], components });

      await interaction.editReply({
        content: `✅ Vous avez été assigné à l'équipe **${otherTeam.toUpperCase()}**.`,
      });
    } catch (error) {
      console.error("[ERROR]".red + " Erreur dans switchTeam:", error);
      await interaction.editReply({
        content: mConfig.embedErrorMessage,
      }).catch(() => {});
    }
  },
};
