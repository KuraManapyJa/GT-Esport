require("colors");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const MMRRating = require("../../schemas/mmrRatingSchema");
const Points = require("../../schemas/pointsSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Affiche le classement des joueurs")
    .addStringOption((option) =>
      option
        .setName("game")
        .setDescription("Le jeu pour lequel afficher le classement")
        .setRequired(false)
        .addChoices(
          { name: "League of Legends", value: "lol" },
          { name: "Valorant", value: "valorant" },
          { name: "Autre", value: "other" }
        )
    )
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      const game = interaction.options.getString("game") || "lol";

      // Récupérer tous les points pour ce serveur et ce jeu
      const allPoints = await Points.find({
        guildId: interaction.guild.id,
        game: game,
      }).sort({ wins: -1, losses: 1 });

      if (allPoints.length === 0) {
        return await interaction.reply({
          content: "❌ Aucun joueur n'a encore joué de match pour ce jeu.",
          ephemeral: true,
        });
      }

      // Récupérer les MMR pour calculer le skill
      const leaderboardData = [];
      for (const point of allPoints) {
        const mmr = await MMRRating.findOne({
          userId: point.userId,
          guildId: interaction.guild.id,
          game: game,
        });

        let skill = 0;
        let displayMMR = "0/10GP";

        if (mmr) {
          skill = mmr.mu - 2 * mmr.sigma; // TrueSkill skill calculation
          if (mmr.gamesPlayed >= 10) {
            displayMMR = `${Math.round(skill * 100)}`;
          } else {
            displayMMR = `${mmr.gamesPlayed}/10GP`;
          }
        }

        const winRate =
          point.wins + point.losses > 0
            ? ((point.wins / (point.wins + point.losses)) * 100).toFixed(1)
            : 0;

        leaderboardData.push({
          userId: point.userId,
          wins: point.wins,
          losses: point.losses,
          winRate: parseFloat(winRate),
          skill: skill,
          displayMMR: displayMMR,
          gamesPlayed: mmr?.gamesPlayed || 0,
        });
      }

      // Trier par skill (MMR) puis par win rate
      leaderboardData.sort((a, b) => {
        if (b.skill !== a.skill) return b.skill - a.skill;
        return b.winRate - a.winRate;
      });

      // Prendre le top 10
      const top10 = leaderboardData.slice(0, 10);

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Leaderboard - ${game.toUpperCase()}`)
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp();

      let leaderboardText = "";
      for (let i = 0; i < top10.length; i++) {
        const data = top10[i];
        const member = await interaction.guild.members.fetch(data.userId).catch(() => null);
        const memberName = member ? member.displayName : "Utilisateur inconnu";

        let medal = "";
        if (i === 0) medal = "🥇";
        else if (i === 1) medal = "🥈";
        else if (i === 2) medal = "🥉";
        else medal = `#${i + 1}`;

        leaderboardText += `${medal} \`${memberName}\` ${data.displayMMR} ${data.wins}W ${data.losses}L ${data.winRate}% WR\n`;
      }

      embed.setDescription(leaderboardText || "Aucun joueur");

      await interaction.reply({
        embeds: [embed],
      });
    } catch (err) {
      console.log("[ERROR]".red + " Error in leaderboard.js:", err);
      await interaction
        .reply({
          content: mConfig.embedErrorMessage,
          ephemeral: true,
        })
        .catch(() => {});
    }
  },
};
