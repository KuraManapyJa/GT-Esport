require("colors");
const { EmbedBuilder } = require("discord.js");
const { rate, Rating } = require("ts-trueskill");
const Game = require("../../schemas/gameSchema");
const GameMember = require("../../schemas/gameMemberSchema");
const MMRRating = require("../../schemas/mmrRatingSchema");
const Points = require("../../schemas/pointsSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "win_confirm",
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
      const winningTeam = parts[3];

      const game = await Game.findOne({ gameId });
      if (!game) {
        return await interaction.editReply({
          content: "❌ Match introuvable.",
        });
      }

      if (game.status !== "in_progress") {
        return await interaction.editReply({
          content: "❌ Ce match n'est plus en cours.",
        });
      }

      // Vérifier si le MMR est activé pour ce match
      const mmrEnabled = game.mmrEnabled !== undefined ? game.mmrEnabled : true;

      // Récupérer tous les membres
      const members = await GameMember.find({ gameId });

      // Récupérer les MMR de tous les joueurs (seulement si MMR activé)
      const winningTeamRatings = [];
      const losingTeamRatings = [];

      for (const member of members) {
        let rating;
        
        if (mmrEnabled) {
          let mmr = await MMRRating.findOne({
            userId: member.userId,
            guildId: game.guildId,
            game: game.game,
          });

          if (!mmr) {
            mmr = await MMRRating.create({
              userId: member.userId,
              guildId: game.guildId,
              game: game.game,
              mu: 25.0,
              sigma: 8.333,
            });
          }

          rating = new Rating(mmr.mu, mmr.sigma);
        } else {
          // Si MMR désactivé, ne pas mettre à jour les MMR
          rating = new Rating(25.0, 8.333); // Rating par défaut pour le calcul
        }

        if (member.team === winningTeam) {
          winningTeamRatings.push({ userId: member.userId, rating });
        } else {
          losingTeamRatings.push({ userId: member.userId, rating });
        }
      }

      // Mettre à jour les MMR avec TrueSkill (seulement si MMR activé)
      if (mmrEnabled) {
        // rate() prend un tableau de tableaux (équipes) et retourne les nouvelles ratings
        // Par défaut, la première équipe gagne
        const winningTeamRatingsArray = winningTeamRatings.map((p) => p.rating);
        const losingTeamRatingsArray = losingTeamRatings.map((p) => p.rating);
        const [newWinningRatings, newLosingRatings] = rate([winningTeamRatingsArray, losingTeamRatingsArray]);

        // Mettre à jour les MMR dans la base de données
        for (let i = 0; i < winningTeamRatings.length; i++) {
          const userId = winningTeamRatings[i].userId;
          const newRating = newWinningRatings[i];

          await MMRRating.updateOne(
            { userId, guildId: game.guildId, game: game.game },
            {
              $set: {
                mu: newRating.mu,
                sigma: newRating.sigma,
                lastUpdated: new Date(),
              },
              $inc: { gamesPlayed: 1 },
            }
          );

          // Mettre à jour les points (wins/losses)
          await Points.updateOne(
            { userId, guildId: game.guildId, game: game.game },
            {
              $inc: { wins: 1 },
              $set: { lastUpdated: new Date() },
            },
            { upsert: true }
          );
        }

        for (let i = 0; i < losingTeamRatings.length; i++) {
          const userId = losingTeamRatings[i].userId;
          const newRating = newLosingRatings[i];

          await MMRRating.updateOne(
            { userId, guildId: game.guildId, game: game.game },
            {
              $set: {
                mu: newRating.mu,
                sigma: newRating.sigma,
                lastUpdated: new Date(),
              },
              $inc: { gamesPlayed: 1 },
            }
          );

          // Mettre à jour les points (wins/losses)
          await Points.updateOne(
            { userId, guildId: game.guildId, game: game.game },
            {
              $inc: { losses: 1 },
              $set: { lastUpdated: new Date() },
            },
            { upsert: true }
          );
        }
      } else {
        // Si MMR désactivé, seulement mettre à jour les wins/losses
        for (const member of members) {
          if (member.team === winningTeam) {
            await Points.updateOne(
              { userId: member.userId, guildId: game.guildId, game: game.game },
              {
                $inc: { wins: 1 },
                $set: { lastUpdated: new Date() },
              },
              { upsert: true }
            );
          } else {
            await Points.updateOne(
              { userId: member.userId, guildId: game.guildId, game: game.game },
              {
                $inc: { losses: 1 },
                $set: { lastUpdated: new Date() },
              },
              { upsert: true }
            );
          }
        }
      }

      // Mettre à jour le statut du match
      game.status = "finished";
      game.finishedAt = new Date();
      await game.save();

      // Nettoyer les salons et rôles
      const guild = client.guilds.cache.get(game.guildId);
      if (guild) {
        try {
          // Supprimer les salons
          if (game.lobbyChannelId) {
            const lobby = guild.channels.cache.get(game.lobbyChannelId);
            if (lobby) await lobby.delete();
          }
          if (game.discussionChannelId) {
            const discussion = guild.channels.cache.get(game.discussionChannelId);
            if (discussion) await discussion.delete();
          }
          if (game.blueVoiceChannelId) {
            const blueVoice = guild.channels.cache.get(game.blueVoiceChannelId);
            if (blueVoice) await blueVoice.delete();
          }
          if (game.redVoiceChannelId) {
            const redVoice = guild.channels.cache.get(game.redVoiceChannelId);
            if (redVoice) await redVoice.delete();
          }

          // Supprimer les rôles
          if (game.blueRoleId) {
            const blueRole = guild.roles.cache.get(game.blueRoleId);
            if (blueRole) await blueRole.delete();
          }
          if (game.redRoleId) {
            const redRole = guild.roles.cache.get(game.redRoleId);
            if (redRole) await redRole.delete();
          }

          // Supprimer la catégorie
          const category = guild.channels.cache.find(
            (c) => c.type === 4 && c.name.includes(game.gameId.substring(0, 8))
          );
          if (category) await category.delete();
        } catch (error) {
          console.error("Erreur lors du nettoyage:", error);
        }
      }

      // Mettre à jour le message de queue
      const queueChannel = client.channels.cache.get(game.queueChannelId);
      if (queueChannel) {
        try {
          const queueMessage = await queueChannel.messages.fetch(game.queueMessageId);
          const embed = new EmbedBuilder()
            .setTitle("🏆 Match terminé")
            .setDescription(
              `L'équipe **${winningTeam === "blue" ? "BLEUE" : "ROUGE"}** a remporté la victoire !\n\n` +
                `Le MMR de tous les joueurs a été mis à jour.`
            )
            .setColor(`#${mConfig.embedColorSuccess}`)
            .setFooter({
              text: `Game ID: ${gameId}`,
            });

          await queueMessage.edit({ embeds: [embed], components: [] });
        } catch (error) {
          console.error("Erreur lors de la mise à jour du message:", error);
        }
      }

      await interaction.editReply({
        content: `✅ Match terminé ! L'équipe **${winningTeam === "blue" ? "BLEUE" : "ROUGE"}** a gagné. Le MMR a été mis à jour.`,
      });
    } catch (error) {
      console.error("[ERROR]".red + " Erreur dans winConfirm:", error);
      await interaction.editReply({
        content: mConfig.embedErrorMessage,
      }).catch(() => {});
    }
  },
};
