require("colors");

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
} = require("discord.js");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup_ticket")
    .setDescription(
      "Configure le système de tickets étape par étape (Admin uniquement).",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      // Vérifier si une configuration existe déjà
      const existingConfig = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });

      const embed = new EmbedBuilder()
        .setTitle("🎫 Configuration du Système de Tickets")
        .setDescription(
          `Bienvenue dans le système de configuration des tickets !\n\n` +
            `Veuillez sélectionner le channel où le panneau de tickets sera affiché.\n\n` +
            `**ℹ️ Information :**\n` +
            `Le panneau de tickets permettra aux membres de créer des tickets en sélectionnant une catégorie.\n\n` +
            `Une fois le channel sélectionné, vous pourrez choisir la catégorie où les tickets seront créés.`,
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Configuration des Tickets`,
        })
        .setTimestamp();

      // Créer le selectmenu avec les channels textuels
      const channels = interaction.guild.channels.cache
        .filter((channel) => channel.type === ChannelType.GuildText)
        .sort((a, b) => a.position - b.position)
        .first(25);

      if (channels.size === 0) {
        return interaction.reply({
          content: "`❌` Aucun channel textuel trouvé sur ce serveur.",
          ephemeral: true,
        });
      }

      const channelSelect = new StringSelectMenuBuilder()
        .setCustomId("ticket_setup_step1_channel")
        .setPlaceholder("📝 Sélectionnez le channel du ticket")
        .setMinValues(1)
        .setMaxValues(1);

      channels.forEach((channel) => {
        channelSelect.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(channel.name)
            .setValue(channel.id)
            .setDescription(`Channel: #${channel.name}`)
            .setEmoji("📝"),
        );
      });

      const row = new ActionRowBuilder().addComponents(channelSelect);

      // Ajouter l'indicateur d'étape
      embed.setDescription(
        embed.data.description +
          `\n\n🔶 **Étape actuelle :** Sélection du channel ou le ticket apparaîtra`,
      );

      return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
    } catch (err) {
      console.log("[ERROR]".red + " Error in setupTicket.js run function:");
      console.log(err);
      return interaction.reply({
        content: mConfig.embedErrorMessage,
        ephemeral: true,
      });
    }
  },
};
