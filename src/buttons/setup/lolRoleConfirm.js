const { 
  EmbedBuilder, 
  MessageFlags 
} = require("discord.js");
const lolGuildConfigSchema = require("../../schemas/lolGuildConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "lol_role_confirm",
  run: async (client, interaction) => {
    try {
      // customId: lol_role_confirm_RANK_ROLEID
      const parts = interaction.customId.split("_");
      const rank = parts[3];
      const roleId = parts[4];
      const role = interaction.guild.roles.cache.get(roleId);

      // Save to DB
      const config = await lolGuildConfigSchema.findOne({ guildId: interaction.guildId }) || new lolGuildConfigSchema({ guildId: interaction.guildId });
      
      if (!config.rankRoles) config.rankRoles = new Map();
      config.rankRoles.set(rank, roleId);
      
      await config.save();

      const embed = new EmbedBuilder()
        .setColor(mConfig.embedColorSuccess || "16c60c")
        .setTitle("✅ Configuration Sauvegardée")
        .setDescription(`Le rôle **${role ? role.name : roleId}** a été associé au rang **${rank}**.`)
        .addFields(
            { name: "Rang", value: rank, inline: true },
            { name: "Rôle", value: `${role}`, inline: true }
        );

      await interaction.update({
        embeds: [embed],
        components: []
      });

    } catch (err) {
      console.log("[ERROR] lolRoleConfirm:", err);
      await interaction.reply({ 
          content: "❌ Erreur de sauvegarde.", 
          flags: MessageFlags.Ephemeral 
      }).catch(() => {});
    }
  }
};
