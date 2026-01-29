require("colors");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Game = require("../../schemas/gameSchema");
const GameMember = require("../../schemas/gameMemberSchema");
const { updateReadyUpMessage } = require("../../utils/queueManager");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "queue_ready",
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
          content: "❌ Ce match n'existe plus.",
        });
      }

      if (game.status !== "ready") {
        return await interaction.editReply({
          content: "❌ Ce match n'est plus en phase de ready up.",
        });
      }

      const member = await GameMember.findOne({
        gameId,
        userId: interaction.user.id,
      });

      if (!member) {
        return await interaction.editReply({
          content: "❌ Vous n'êtes pas dans ce match.",
        });
      }

      if (member.ready) {
        return await interaction.editReply({
          content: "❌ Vous êtes déjà prêt.",
        });
      }

      member.ready = true;
      await member.save();

      // Vérifier si tous les joueurs sont prêts
      const allMembers = await GameMember.find({ gameId });
      const allReady = allMembers.every((m) => m.ready);

      if (allReady) {
        game.status = "in_progress";
        await game.save();

        // Notifier dans le lobby
        const lobbyChannel = client.channels.cache.get(game.lobbyChannelId);
        if (lobbyChannel) {
          await lobbyChannel.send("🎮 **Tous les joueurs sont prêts ! Le match peut commencer !**");
        }

        // Mettre à jour le message de queue
        const queueChannel = client.channels.cache.get(game.queueChannelId);
        const queueMessage = await queueChannel.messages.fetch(game.queueMessageId);
        const embed = new EmbedBuilder()
          .setTitle("🎮 Match en cours")
          .setDescription("Le match a commencé ! Bonne chance à tous !")
          .setColor(`#${mConfig.embedColorSuccess}`);

        await queueMessage.edit({ embeds: [embed], components: [] });
      } else {
        // Mettre à jour le message ready up
        await updateReadyUpMessage(client, gameId);
      }

      await interaction.editReply({
        content: "✅ Vous êtes prêt !",
      });
    } catch (error) {
      console.error("[ERROR]".red + " Erreur dans readyUp:", error);
      await interaction.editReply({
        content: mConfig.embedErrorMessage,
      }).catch(() => {});
    }
  },
};
