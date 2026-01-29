require("colors");

const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lol_link")
    .setDescription("Lie votre compte League of Legends à votre compte Discord")
    .addStringOption((option) =>
      option
        .setName("summoner")
        .setDescription("Votre Riot ID (ex: Player)")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("tag")
        .setDescription("Votre tag (ex: EUW)")
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
      const gameName = interaction.options.getString("summoner");
      const tagLine = interaction.options.getString("tag");
      const apiKey = process.env.RIOT_API_KEY;

      if (!apiKey) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription(
            "❌ La clé API Riot Games n'est pas configurée. Contactez un administrateur.",
          );

        return interaction.reply({
          embeds: [errorEmbed],
          ephemeral: true,
        });
      }

      // Créer l'embed de sélection de région
      const embed = new EmbedBuilder()
        .setTitle("🎮 Liaison de votre compte League of Legends")
        .setDescription(
          `Bienvenue dans l'assistant de liaison de compte LoL !\n\n` +
            `Vous êtes sur le point de lier le compte **${gameName}#${tagLine}** à votre compte Discord.\n\n` +
            `**ℹ️ Information :**\n` +
            `Cette liaison permettra au bot d'afficher vos statistiques, de mettre à jour votre pseudo et vos rôles automatiquement.`,
        )
        .addFields(
          {
            name: "📄 Instructions",
            value:
              "1️⃣ Sélectionnez votre région dans le menu déroulant ci-dessous.\n" +
              "2️⃣ Confirmez votre compte dans l'étape suivante.",
            inline: false,
          },
          {
            name: "ℹ️ Riot ID",
            value: `\`${gameName}#${tagLine}\``,
            inline: true,
          },
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Liaison compte LoL`,
        })
        .setTimestamp();

      // Créer le select menu des régions
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`lol_link_region_${gameName}_${tagLine}`)
        .setPlaceholder("Sélectionnez votre région")
        .addOptions([
          { label: "Europe West (EUW)", value: "euw1", emoji: "🇪🇺" },
          { label: "Europe Nordic & East (EUNE)", value: "eun1", emoji: "🇪🇺" },
          { label: "North America (NA)", value: "na1", emoji: "🇺🇸" },
          { label: "Korea (KR)", value: "kr", emoji: "🇰🇷" },
          { label: "Japan (JP)", value: "jp1", emoji: "🇯🇵" },
          { label: "Brazil (BR)", value: "br1", emoji: "🇧🇷" },
          { label: "Latin America North (LAN)", value: "la1", emoji: "🌎" },
          { label: "Latin America South (LAS)", value: "la2", emoji: "🌎" },
          { label: "Oceania (OCE)", value: "oc1", emoji: "🇦🇺" },
          { label: "Turkey (TR)", value: "tr1", emoji: "🇹🇷" },
          { label: "Russia (RU)", value: "ru", emoji: "🇷🇺" },
        ]);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      // Envoyer le message éphémère
      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
    } catch (err) {
      const errorEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorError)
        .setDescription(
          mConfig.embedErrorMessage || "❌ Une erreur s'est produite !",
        );

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({
          embeds: [errorEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
