require("colors");

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "lol_link_back_",
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      // Extraire gameName et tagLine du customId
      const customIdData = interaction.customId.replace("lol_link_back_", "");
      const parts = customIdData.split("_");
      const tagLine = parts.pop();
      const gameName = parts.join("_");

      // Recréer l'embed de sélection de région
      const embed = new EmbedBuilder()
        .setColor(mConfig.embedColorIncolor || "313338")
        .setTitle("🎮 Liaison de compte League of Legends")
        .setDescription(
          `Vous souhaitez lier le compte **${gameName}#${tagLine}** à votre compte Discord.`,
        )
        .addFields(
          {
            name: "📄 Instructions",
            value: "Sélectionnez votre région dans le menu déroulant ci-dessous.",
            inline: false,
          },
          {
            name: "ℹ️ Riot ID",
            value: `\`${gameName}#${tagLine}\``,
            inline: true,
          },
        )
        .setFooter({ text: mConfig.footerText || "Example Texte" });

      // Recréer le select menu des régions
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

      await interaction.update({
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.log("[ERROR]".red + " Error in lolLinkBack.js run function:");
      console.log(err);

      const errorEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorError)
        .setDescription(
          mConfig.embedErrorMessage || "❌ Une erreur s'est produite !",
        );

      try {
        await interaction.update({ embeds: [errorEmbed], components: [] });
      } catch (e) {
        console.log("[ERROR]".red + " Failed to send error message:", e.message);
      }
    }
  },
};
