require("colors");

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const mConfig = require("../../messageConfig.json");
const RiotAPI = require("../../utils/riotAPI");

module.exports = {
  customId: "lol_link_region_",
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      // Extraire gameName et tagLine du customId
      const customIdParts = interaction.customId.replace("lol_link_region_", "").split("_");
      const tagLine = customIdParts.pop(); // Le dernier élément est le tag
      const gameName = customIdParts.join("_"); // Le reste est le nom (peut contenir des _)
      
      const region = interaction.values[0];
      const apiKey = process.env.RIOT_API_KEY;

      if (!apiKey) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription(
            "❌ La clé API Riot Games n'est pas configurée. Contactez un administrateur.",
          );

        return interaction.update({
          embeds: [errorEmbed],
          components: [],
        });
      }

      // Vérifier que le compte existe
      await interaction.deferUpdate();

      const riotAPI = new RiotAPI(apiKey);
      let accountData;

      try {
        accountData = await riotAPI.getAccountByRiotId(gameName, tagLine, region);
      } catch (error) {
        const errorEmbed = new EmbedBuilder()
          .setColor(mConfig.embedColorError)
          .setDescription(
            `❌ Compte introuvable : ${error.message}\n\nVérifiez que le Riot ID (**${gameName}#${tagLine}**) et la région sont corrects.`,
          );

        return interaction.editReply({
          embeds: [errorEmbed],
          components: [],
        });
      }

      // Mapper la région pour l'affichage
      const regionNames = {
        euw1: "Europe West (EUW)",
        eun1: "Europe Nordic & East (EUNE)",
        na1: "North America (NA)",
        kr: "Korea (KR)",
        jp1: "Japan (JP)",
        br1: "Brazil (BR)",
        la1: "Latin America North (LAN)",
        la2: "Latin America South (LAS)",
        oc1: "Oceania (OCE)",
        tr1: "Turkey (TR)",
        ru: "Russia (RU)",
      };

      // Créer l'embed de confirmation
      const confirmationEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorIncolor || "313338")
        .setTitle("🎮 Confirmation de liaison")
        .setDescription("Veuillez confirmer les informations de votre compte.")
        .addFields(
          {
            name: "📝 Riot ID",
            value: `**${accountData.gameName}#${accountData.tagLine}**`,
            inline: false,
          },
          {
            name: "🌍 Région",
            value: regionNames[region] || region.toUpperCase(),
            inline: true,
          },
          {
            name: "🔑 PUUID",
            value: `\`${accountData.puuid.substring(0, 20)}...\``,
            inline: true,
          },
        )
        .setFooter({ text: mConfig.footerText || "Example Texte" });

      // Créer les boutons
      const confirmButton = new ButtonBuilder()
        .setCustomId(`lol_link_confirm_${accountData.gameName}_${accountData.tagLine}_${region}`)
        .setLabel("Confirmer")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅");

      const backButton = new ButtonBuilder()
        .setCustomId(`lol_link_back_${gameName}_${tagLine}`)
        .setLabel("Retour")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⬅️");

      const buttonRow = new ActionRowBuilder().addComponents([
        backButton,
        confirmButton,
      ]);

      await interaction.editReply({
        embeds: [confirmationEmbed],
        components: [buttonRow],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red + " Error in lolLinkRegionSelect.js run function:",
      );
      console.log(err);

      const errorEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorError)
        .setDescription(
          mConfig.embedErrorMessage || "❌ Une erreur s'est produite !",
        );

      try {
        if (interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed], components: [] });
        } else {
          await interaction.update({ embeds: [errorEmbed], components: [] });
        }
      } catch (e) {
        console.log("[ERROR]".red + " Failed to send error message:", e.message);
      }
    }
  },
};
