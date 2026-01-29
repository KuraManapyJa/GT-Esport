const {
  RoleSelectMenuBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "lol_role_rank_select",
  run: async (client, interaction) => {
    try {
      const selectedRank = interaction.values[0];

      // Créer le Role Select Menu, en conservant le rang dans le customId
      const roleSelect = new RoleSelectMenuBuilder()
        .setCustomId(`lol_role_select_${selectedRank}`)
        .setPlaceholder(`🛡️ Sélectionnez le rôle pour ${selectedRank}`)
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder().addComponents(roleSelect);

      // Embed calqué sur le style du setup de tickets (infos + étape actuelle)
      const embed = new EmbedBuilder()
        .setTitle("🎮 Configuration des Rôles de Rang")
        .setDescription(
          `✅ **Rang sélectionné :** ${selectedRank}\n\n` +
            `Veuillez sélectionner le **rôle Discord** qui sera attribué aux joueurs de ce rang.\n\n` +
            `**ℹ️ Information :**\n` +
            `Ce rôle permettra d'afficher le rang des joueurs directement sur le serveur.\n` +
            `Vous pourrez répéter cette configuration pour chaque rang disponible.`,
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .addFields(
          { name: "1️⃣ Rang", value: selectedRank, inline: true },
          { name: "2️⃣ Rôle", value: "En attente...", inline: true },
        )
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration des rôles LoL`,
        })
        .setTimestamp();

      embed.setDescription(
        embed.data.description +
          `\n\n🔶 **Étape actuelle :** Sélection du rôle pour le rang`,
      );

      await interaction.update({
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.log("[ERROR] lolRoleRankSelect:", err);
      await interaction
        .reply({
          content: "❌ Une erreur s'est produite.",
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  },
};
