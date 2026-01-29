const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "lol_setup_role",
  run: async (client, interaction) => {
    try {
      // Extract channelId from customId: lol_setup_role_CHANNELID
      const channelId = interaction.customId.split("_")[3];
      const roleId = interaction.values[0];

      const channel = interaction.guild.channels.cache.get(channelId);
      const role = interaction.guild.roles.cache.get(roleId);

      if (!channel) {
        return interaction.update({
          content: "❌ Le salon sélectionné est introuvable.",
          components: [],
        });
      }

      // Embed de confirmation dans le même style que ticket setup
      const embed = new EmbedBuilder()
        .setTitle("🛠️ Confirmation de la configuration d'inscription LoL")
        .setDescription(
          `Merci de vérifier les paramètres ci-dessous avant d'activer l'inscription.\n\n` +
            `**ℹ️ Information :**\n` +
            `Le message d'inscription sera envoyé dans le salon choisi et donnera automatiquement le rôle configuré aux joueurs qui s'inscrivent.`,
        )
        .setColor(mConfig.embedColorWarning || "FFCC4D")
        .addFields(
          { name: "1️⃣ Salon", value: `${channel}`, inline: true },
          { name: "2️⃣ Rôle", value: `${role}`, inline: true },
        )
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration inscription LoL`,
        })
        .setTimestamp();

      embed.setDescription(
        embed.data.description +
          `\n\n🔶 **Étape actuelle :** Confirmation de la configuration`,
      );

      const confirmBtn = new ButtonBuilder()
        .setCustomId(`lol_setup_confirm_${channelId}_${roleId}`)
        .setLabel("Confirmer")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(confirmBtn);

      await interaction.update({
        content: "",
        embeds: [embed],
        components: [row]
      });
    } catch (err) {
      console.log("[ERROR] Error in lolSetupRole.js:", err);
      await interaction
        .reply({
          content: "❌ Une erreur s'est produite lors de la finalisation.",
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  },
};
