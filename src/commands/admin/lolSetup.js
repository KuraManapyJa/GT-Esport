require("colors");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lol_setup")
    .setDescription("Configure le système d'inscription League of Legends")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
  ],

  run: async (client, interaction) => {
    try {
      const {
        ChannelSelectMenuBuilder,
        ActionRowBuilder,
      } = require("discord.js");

      // Create Channel Select Menu
      const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId("lol_setup_channel")
        .setPlaceholder("📝 Sélectionnez le salon d'inscription")
        .setChannelTypes([0]); // GuildText only

      const row = new ActionRowBuilder().addComponents(channelSelect);

      const embed = new EmbedBuilder()
        .setTitle("🛠️ Configuration du système d'inscription LoL")
        .setDescription(
          `Bienvenue dans le système de configuration de l'inscription League of Legends !\n\n` +
            `Veuillez sélectionner le **salon** où le message d'inscription sera envoyé.\n\n` +
            `**ℹ️ Information :**\n` +
            `Les joueurs pourront cliquer sur un bouton dans ce salon pour lier leur compte LoL et rejoindre le système.`,
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .addFields({
          name: "1️⃣ Salon d'inscription",
          value: "En attente de sélection...",
          inline: true,
        })
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration inscription LoL`,
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
    } catch (err) {
      console.log("[ERROR] Error in lolSetup.js run function:", err);

      await interaction
        .reply({
          content: "❌ Une erreur s'est produite lors de la configuration.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  },
};
