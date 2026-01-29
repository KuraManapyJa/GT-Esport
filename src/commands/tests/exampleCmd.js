require("colors");

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} = require("discord.js");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Vérifiez que tout fonctionne correctement.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      // Créer l'embed avec le style de la photo
      const embed = new EmbedBuilder()
        .setColor(mConfig.embedColorIncolor || "313338")
        .setTitle("⚔️ Création d'une partie: Profil de jeu")
        .setDescription(
          "Veuillez sélectionner un channel où envoyer le message de test.",
        )
        .addFields(
          {
            name: "📄 Instructions",
            value:
              "Sélectionnez un channel textuel dans le menu déroulant ci-dessous.",
            inline: false,
          },
          {
            name: "ℹ️ Information",
            value:
              'Une fois le channel sélectionné, le message "Ceci est un test" sera envoyé dans le channel choisi.',
            inline: false,
          },
        )
        .setFooter({ text: mConfig.footerText || "Example Texte" });

      // Créer le select menu de channels (recherchable nativement)
      // Note: L'ID et la catégorie seront affichés dans le message de confirmation après la sélection
      const selectMenu = new ChannelSelectMenuBuilder()
        .setCustomId("test_channel_select")
        .setPlaceholder("Sélectionnez un channel (tapez pour rechercher)")
        .setChannelTypes(ChannelType.GuildText); // Limiter aux channels textuels uniquement

      const row = new ActionRowBuilder().addComponents(selectMenu);

      // Envoyer le message éphémère
      await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.log("[ERROR]".red + "Error in your exampleCmd.js run function:");
      console.log(err);
    }
  },

  // Required for autocomplete option handling ---
  autocomplete: async (client, interaction) => {
    try {
      //...
    } catch (err) {
      console.log(
        "[ERROR]".red + "Error in your exampleCmd.js autocomplete function:",
      );
      console.log(err);
    }
  },
  // --- Required for autocomplete option handling
};
