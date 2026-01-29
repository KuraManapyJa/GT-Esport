const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lol_role")
    .setDescription("Configure les rôles liés aux rangs League of Legends")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageRoles],

  run: async (client, interaction) => {
    try {
      const { EmbedBuilder } = require("discord.js");

      // Ranks to configure
      const ranks = [
        "IRON",
        "BRONZE",
        "SILVER",
        "GOLD",
        "PLATINUM",
        "EMERALD",
        "DIAMOND",
        "MASTER",
        "GRANDMASTER",
        "CHALLENGER",
      ];

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("lol_role_rank_select")
        .setPlaceholder("🛡️ Sélectionnez le rang à configurer")
        .addOptions(
          ranks.map((rank) => ({
            label: rank.charAt(0) + rank.slice(1).toLowerCase(), // Capitalized validation
            value: rank,
            description: `Configurer le rôle pour le rang ${rank}`,
          })),
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle("🎮 Configuration des Rôles League of Legends")
        .setDescription(
          `Bienvenue dans le système de configuration des rôles LoL !\n\n` +
            `Veuillez sélectionner le **rang** auquel vous souhaitez associer un rôle Discord.\n\n` +
            `**ℹ️ Information :**\n` +
            `Les rôles de rang permettent d'afficher automatiquement le niveau de vos joueurs sur le serveur.`,
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .addFields({
          name: "1️⃣ Rang à configurer",
          value: "En attente de sélection...",
          inline: true,
        })
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration des rôles LoL`,
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
    } catch (err) {
      console.log("[ERROR] lolRole command:", err);
      await interaction
        .reply({
          content: "❌ Erreur lors de l'exécution.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  },
};
