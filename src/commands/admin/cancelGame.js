require("colors");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const Game = require("../../schemas/gameSchema");
const GameMember = require("../../schemas/gameMemberSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cancel_game")
    .setDescription("Annule un match en cours")
    .addStringOption((option) =>
      option
        .setName("game_id")
        .setDescription("L'ID du match à annuler (optionnel si utilisé dans le salon du match)")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
  ],

  run: async (client, interaction) => {
    try {
      let gameId = interaction.options.getString("game_id");

      await interaction.deferReply({ ephemeral: true });

      // Si pas d'ID fourni, chercher le match actif dans le salon
      if (!gameId) {
        const activeGame = await Game.findOne({
          $or: [
            { lobbyChannelId: interaction.channel.id },
            { discussionChannelId: interaction.channel.id },
            { queueChannelId: interaction.channel.id },
          ],
          status: { $in: ["queue", "ready", "in_progress"] },
        });

        if (!activeGame) {
          return await interaction.editReply({
            content: "❌ Aucun match actif trouvé. Veuillez spécifier un game_id.",
          });
        }

        gameId = activeGame.gameId;
      }

      const game = await Game.findOne({ gameId });
      if (!game) {
        return await interaction.editReply({
          content: "❌ Match introuvable.",
        });
      }

      if (game.status === "finished") {
        return await interaction.editReply({
          content: "❌ Ce match est déjà terminé.",
        });
      }

      // Nettoyer les salons et rôles
      const guild = client.guilds.cache.get(game.guildId);
      if (guild) {
        try {
          // Supprimer les salons
          if (game.lobbyChannelId) {
            const lobby = guild.channels.cache.get(game.lobbyChannelId);
            if (lobby) await lobby.delete().catch(() => {});
          }
          if (game.discussionChannelId) {
            const discussion = guild.channels.cache.get(game.discussionChannelId);
            if (discussion) await discussion.delete().catch(() => {});
          }
          if (game.blueVoiceChannelId) {
            const blueVoice = guild.channels.cache.get(game.blueVoiceChannelId);
            if (blueVoice) await blueVoice.delete().catch(() => {});
          }
          if (game.redVoiceChannelId) {
            const redVoice = guild.channels.cache.get(game.redVoiceChannelId);
            if (redVoice) await redVoice.delete().catch(() => {});
          }

          // Supprimer les rôles
          if (game.blueRoleId) {
            const blueRole = guild.roles.cache.get(game.blueRoleId);
            if (blueRole) await blueRole.delete().catch(() => {});
          }
          if (game.redRoleId) {
            const redRole = guild.roles.cache.get(game.redRoleId);
            if (redRole) await redRole.delete().catch(() => {});
          }

          // Supprimer la catégorie
          const category = guild.channels.cache.find(
            (c) => c.type === 4 && (c.name.includes(game.gameId.substring(0, 8)) || c.name.includes(`Match: ${game.gameId.substring(0, 8)}`) || c.name.includes(`🎯┆Match: ${game.gameId.substring(0, 8)}`))
          );
          if (category) await category.delete().catch(() => {});
        } catch (error) {
          console.error("Erreur lors du nettoyage:", error);
        }
      }

      // Supprimer tous les membres du match
      await GameMember.deleteMany({ gameId });

      // Mettre à jour le statut du match
      game.status = "finished";
      game.finishedAt = new Date();
      await game.save();

      // Mettre à jour le message de queue
      const queueChannel = client.channels.cache.get(game.queueChannelId);
      if (queueChannel) {
        try {
          const queueMessage = await queueChannel.messages.fetch(game.queueMessageId).catch(() => null);
          if (queueMessage) {
            const embed = new EmbedBuilder()
              .setTitle("❌ Match annulé")
              .setDescription(
                `Le match **${gameId.substring(0, 8)}** a été annulé par un administrateur.`
              )
              .setColor(`#${mConfig.embedColorError}`)
              .setFooter({
                text: `Game ID: ${gameId.substring(0, 8)}`,
              });

            await queueMessage.edit({ embeds: [embed], components: [] });
          }
        } catch (error) {
          console.error("Erreur lors de la mise à jour du message:", error);
        }
      }

      try {
        await interaction.editReply({
          content: `✅ Le match **${gameId.substring(0, 8)}** a été annulé avec succès.`,
        });
      } catch (editError) {
        await interaction.followUp({
          content: `✅ Le match **${gameId.substring(0, 8)}** a été annulé avec succès.`,
          ephemeral: true,
        }).catch(() => {});
      }
    } catch (err) {
      console.log("[ERROR]".red + " Error in cancelGame.js:", err);
      try {
        await interaction.editReply({
          content: "❌ Une erreur s'est produite lors de l'annulation du match.",
        });
      } catch (editError) {
        await interaction.followUp({
          content: "❌ Une erreur s'est produite lors de l'annulation du match.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
