const {
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  MessageFlags,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "lol_setup_channel",
  run: async (client, interaction) => {
    try {
      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);

      // Verify permissions in selected channel
      const botPermissionsInChannel = channel.permissionsFor(client.user);
      if (!botPermissionsInChannel.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        return interaction.reply({
          content: `❌ Je n'ai pas les permissions nécessaires (Envoyer des messages, Intégrer des liens) dans le salon ${channel}. Veuillez en choisir un autre.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Créer le Role Select Menu, en encodant le channelId dans le customId: lol_setup_role_CHANNELID
      const roleSelect = new RoleSelectMenuBuilder()
        .setCustomId(`lol_setup_role_${channelId}`)
        .setPlaceholder("🛡️ Sélectionnez le rôle à donner au membre")
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder().addComponents(roleSelect);

      // Embed dans le style de ticket setup : récap + infos + étape actuelle
      const embed = new EmbedBuilder()
        .setTitle("🛠️ Configuration du Système d'Inscription LoL")
        .setDescription(
          `✅ **Salon sélectionné :** ${channel}\n\n` +
            `Veuillez maintenant sélectionner le **rôle** qui sera donné aux membres lorsqu'ils s'inscrivent.\n\n` +
            `**ℹ️ Information :**\n` +
            `Ce rôle pourra être utilisé pour identifier facilement les joueurs inscrits à votre système League of Legends.`,
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .addFields(
          { name: "1️⃣ Salon", value: `${channel}`, inline: true },
          { name: "2️⃣ Rôle", value: "En attente...", inline: true },
        )
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration inscription LoL`,
        })
        .setTimestamp();

      embed.setDescription(
        embed.data.description +
          `\n\n🔶 **Étape actuelle :** Sélection du rôle d'inscription`,
      );

      await interaction.update({
        embeds: [embed],
        components: [row],
      });

    } catch (err) {
      console.log("[ERROR] Error in lolSetupChannel.js:", err);
      await interaction.reply({
         content: "❌ Une erreur s'est produite.",
         flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
};
