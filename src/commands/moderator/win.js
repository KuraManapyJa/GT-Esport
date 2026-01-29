require("colors");
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Game = require("../../schemas/gameSchema");
const GameMember = require("../../schemas/gameMemberSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("win")
    .setDescription("Déclare le gagnant d'un match")
    .addStringOption((option) =>
      option
        .setName("team")
        .setDescription("L'équipe gagnante")
        .setRequired(true)
        .addChoices(
          { name: "Équipe Bleue", value: "blue" },
          { name: "Équipe Rouge", value: "red" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("game_id")
        .setDescription("L'ID du match (optionnel si utilisé dans le salon du match)")
        .setRequired(false)
    )
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [PermissionStatus.ManageChannels],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      let gameId = interaction.options.getString("game_id");
      const winningTeam = interaction.options.getString("team");

      // Si pas d'ID fourni, chercher le match actif dans le salon
      if (!gameId) {
        const activeGame = await Game.findOne({
          $or: [
            { lobbyChannelId: interaction.channel.id },
            { queueChannelId: interaction.channel.id },
          ],
          status: "in_progress",
        });

        if (!activeGame) {
          return await interaction.reply({
            content: "❌ Aucun match actif trouvé. Veuillez spécifier un game_id.",
            ephemeral: true,
          });
        }

        gameId = activeGame.gameId;
      }

      const game = await Game.findOne({ gameId });
      if (!game) {
        return await interaction.reply({
          content: "❌ Match introuvable.",
          ephemeral: true,
        });
      }

      if (game.status !== "in_progress") {
        return await interaction.reply({
          content: "❌ Ce match n'est pas en cours.",
          ephemeral: true,
        });
      }

      // Vérifier que l'utilisateur fait partie du match
      const member = await GameMember.findOne({
        gameId,
        userId: interaction.user.id,
      });

      if (!member) {
        return await interaction.reply({
          content: "❌ Vous ne faites pas partie de ce match.",
          ephemeral: true,
        });
      }

      // Créer un embed de confirmation avec boutons
      const teamName = winningTeam === "blue" ? "BLEUE" : "ROUGE";
      const confirmEmbed = new EmbedBuilder()
        .setTitle("🏆 Confirmation de victoire")
        .setDescription(
          `Voulez-vous confirmer que l'équipe **${teamName}** a gagné ce match ?\n\n` +
            `**⚠️ Cette action est irréversible !**`
        )
        .setColor(`#${mConfig.embedColorWarning}`)
        .setFooter({
          text: `Game ID: ${gameId}`,
        });

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`win_confirm_${gameId}_${winningTeam}`)
          .setLabel("Confirmer")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`win_cancel_${gameId}`)
          .setLabel("Annuler")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({
        embeds: [confirmEmbed],
        components: [confirmRow],
        ephemeral: true,
      });
    } catch (err) {
      console.log("[ERROR]".red + " Error in win.js:", err);
      await interaction
        .reply({
          content: mConfig.embedErrorMessage,
          ephemeral: true,
        })
        .catch(() => {});
    }
  },
};
