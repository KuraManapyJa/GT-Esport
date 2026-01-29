require("colors");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const QueueConfig = require("../../schemas/queueConfigSchema");
const Game = require("../../schemas/gameSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove_setup")
    .setDescription("Supprime un setup InHouse Queue et ses canaux")
    .addStringOption((option) =>
      option
        .setName("game")
        .setDescription("Le jeu dont vous voulez supprimer le setup")
        .setRequired(true)
        .addChoices(
          { name: "League of Legends", value: "lol" },
          { name: "Valorant", value: "valorant" },
          { name: "Autre (5v5)", value: "other" }
        )
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
  ],

  run: async (client, interaction) => {
    try {
      const game = interaction.options.getString("game");
      const guild = interaction.guild;

      await interaction.deferReply({ ephemeral: true });

      // Trouver le setup
      const queueConfig = await QueueConfig.findOne({
        guildId: guild.id,
        game: game,
      });

      if (!queueConfig) {
        return await interaction.editReply({
          content: `❌ Aucun setup trouvé pour **${game.toUpperCase()}**.`,
        });
      }

      // Vérifier s'il y a des matchs actifs
      const activeGames = await Game.find({
        guildId: guild.id,
        status: { $in: ["queue", "ready", "in_progress"] },
      });

      if (activeGames.length > 0) {
        return await interaction.editReply({
          content: `❌ Il y a ${activeGames.length} match(s) actif(s). Terminez-les avant de supprimer le setup.`,
        });
      }

      // Noms des jeux pour trouver la catégorie
      const gameNames = {
        lol: "LEAGUE OF LEGENDS",
        valorant: "VALORANT",
        other: "JEU PERSONNALISÉ",
      };

      const gameName = gameNames[game] || "CUSTOM GAME";

      // Trouver et supprimer la catégorie principale
      const mainCategory = guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildCategory &&
          (c.name === `INHOUSE - ${gameName}` || c.name === `🎮┆INHOUSE - ${gameName}`)
      );

      if (mainCategory) {
        // Supprimer tous les canaux de la catégorie
        const channelsInCategory = guild.channels.cache.filter(
          (c) => c.parentId === mainCategory.id
        );

        for (const channel of channelsInCategory.values()) {
          try {
            await channel.delete();
          } catch (error) {
            console.error(`Erreur lors de la suppression du canal ${channel.name}:`, error);
          }
        }

        // Supprimer la catégorie
        try {
          await mainCategory.delete();
        } catch (error) {
          console.error("Erreur lors de la suppression de la catégorie:", error);
        }
      }

      // Supprimer la configuration de la base de données
      await QueueConfig.deleteOne({
        guildId: guild.id,
        game: game,
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Setup supprimé")
        .setDescription(
          `Le setup InHouse Queue pour **${gameName}** a été supprimé avec succès.\n\n` +
            `**Éléments supprimés :**\n` +
            `• Catégorie \`🎮┆INHOUSE - ${gameName}\`\n` +
            `• Tous les canaux associés\n` +
            `• Configuration de la base de données\n\n` +
            `Vous pouvez maintenant créer un nouveau setup avec \`/setup_inhouse\`.`
        )
        .setColor(`#${mConfig.embedColorSuccess}`)
        .setTimestamp();

      try {
        await interaction.editReply({
          embeds: [embed],
        });
      } catch (editError) {
        // Si editReply échoue, essayer followUp
        await interaction.followUp({
          embeds: [embed],
          ephemeral: true,
        }).catch(() => {});
      }
    } catch (err) {
      console.log("[ERROR]".red + " Error in removeSetup.js:", err);
      try {
        await interaction.editReply({
          content: "❌ Une erreur s'est produite lors de la suppression du setup.",
        });
      } catch (editError) {
        await interaction.followUp({
          content: "❌ Une erreur s'est produite lors de la suppression du setup.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
