require("colors");

const {
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "ticket_setup_step5_mentioned_roles",
  testMode: false,
  devOnly: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferUpdate();

      const selectedRoles = interaction.values;

      // Mettre à jour la config
      let config = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });
      if (!config) {
        return interaction.followUp({
          content: "`❌` Configuration non trouvée.",
          ephemeral: true,
        });
      }

      config.mentionedRoles = selectedRoles;
      await config.save();

      // Étape 6 : Rôles support
      const roles = interaction.guild.roles.cache
        .filter((role) => !role.managed && role.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .first(25);

      const rolesArray = Array.from(roles.values());
      const maxRoles = Math.min(25, rolesArray.length);

      const embed = new EmbedBuilder()
        .setTitle("🎫 Configuration du Système de Tickets")
        .setDescription(
          `✅ **Channel sélectionné :** <#${config.channelId}>\n` +
            `✅ **Catégorie sélectionnée :** <#${config.categoryId}>\n` +
            `✅ **Message du panneau :** ${config.customPanelMessage ? "Personnalisé" : "Par défaut"}\n` +
            `✅ **Message du ticket :** ${config.customTicketMessage ? "Personnalisé" : "Par défaut"}\n` +
            `✅ **Rôles mentionnés :** ${selectedRoles.length > 0 ? selectedRoles.map((id) => `<@&${id}>`).join(", ") : "Aucun"}\n\n` +
            `Sélectionnez les rôles qui pourront voir et gérer les tickets.\n\n` +
            `**ℹ️ Information :**\n` +
            `Ces rôles auront accès à tous les tickets et pourront les gérer.\n\n` +
            `Une fois cette étape terminée, vous pourrez ajouter des catégories de tickets.`,
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration des Tickets`,
        })
        .setTimestamp();

      const supportRolesSelect = new StringSelectMenuBuilder()
        .setCustomId("ticket_setup_step6_support_roles")
        .setPlaceholder("👥 Rôles support")
        .setMinValues(0)
        .setMaxValues(maxRoles > 0 ? maxRoles : 1);

      rolesArray.forEach((role) => {
        const isSelected = config.supportRoles.includes(role.id);
        supportRolesSelect.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(role.name)
            .setValue(role.id)
            .setDescription(`Rôle support: ${role.name}`)
            .setEmoji("👥")
            .setDefault(isSelected),
        );
      });

      embed.setDescription(
        embed.data.description + `\n\n🔶 **Étape actuelle :** Rôles support`,
      );

      const row = new ActionRowBuilder().addComponents(supportRolesSelect);

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red +
          " Error in ticketSetupStep5MentionedRoles.js run function:",
      );
      console.log(err);
    }
  },
};
