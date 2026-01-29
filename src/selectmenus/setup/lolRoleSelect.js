const { EmbedBuilder } = require("discord.js");
const lolGuildConfigSchema = require("../../schemas/lolGuildConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "lol_role_select",
  run: async (client, interaction) => {
    try {
      // customId: lol_role_select_RANK
      const rank = interaction.customId.split("_")[3];
      const roleId = interaction.values[0];
      const role = interaction.guild.roles.cache.get(roleId);

      /*
      // Save removed - Wait for confirmation
      const config = await lolGuildConfigSchema.findOne({ guildId: interaction.guildId }) || new lolGuildConfigSchema({ guildId: interaction.guildId });
      if (!config.rankRoles) config.rankRoles = new Map();
      config.rankRoles.set(rank, roleId);
      await config.save();
      */

      const {
        ButtonBuilder,
        ButtonStyle,
        ActionRowBuilder,
      } = require("discord.js");

      const embed = new EmbedBuilder()
        .setTitle("🎮 Confirmation du rôle de rang")
        .setDescription(
          `Merci de vérifier la liaison suivante avant de la confirmer.\n\n` +
            `**ℹ️ Information :**\n` +
            `Une fois confirmée, tous les joueurs avec le rang **${rank}** pourront recevoir automatiquement ce rôle.`,
        )
        .setColor(mConfig.embedColorWarning || "FFCC4D")
        .addFields(
          { name: "1️⃣ Rang", value: rank, inline: true },
          { name: "2️⃣ Rôle", value: `${role}`, inline: true },
        )
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration des rôles LoL`,
        })
        .setTimestamp();

      embed.setDescription(
        embed.data.description +
          `\n\n🔶 **Étape actuelle :** Confirmation de l'association rang ➝ rôle`,
      );

      const confirmBtn = new ButtonBuilder()
        .setCustomId(`lol_role_confirm_${rank}_${roleId}`)
        .setLabel("Confirmer")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(confirmBtn);

      await interaction.update({
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.log("[ERROR] lolRoleSelect:", err);
      await interaction
        .update({
          content: "❌ Une erreur s'est produite lors de la sauvegarde.",
          components: [],
        })
        .catch(() => {});
    }
  },
};
