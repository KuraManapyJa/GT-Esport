require("colors");

const {
  EmbedBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "ticket_setup_categories",
  testMode: false,
  devOnly: false,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      const selectedValue = interaction.values[0];

      if (selectedValue === "add_category") {
        // Ouvrir un modal pour ajouter une catégorie
        const modal = new ModalBuilder()
          .setCustomId("ticket_add_category_modal")
          .setTitle("Ajouter une Catégorie de Ticket");

        const nameInput = new TextInputBuilder()
          .setCustomId("category_name")
          .setLabel("Nom de la catégorie")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ex: Support, Bug, Suggestion...")
          .setRequired(true)
          .setMaxLength(50);

        const descriptionInput = new TextInputBuilder()
          .setCustomId("category_description")
          .setLabel("Description")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Description de la catégorie")
          .setRequired(true)
          .setMaxLength(100);

        const emojiInput = new TextInputBuilder()
          .setCustomId("category_emoji")
          .setLabel("Emoji (optionnel)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("🎫")
          .setRequired(false)
          .setMaxLength(10);

        const row1 = new ActionRowBuilder().addComponents(nameInput);
        const row2 = new ActionRowBuilder().addComponents(descriptionInput);
        const row3 = new ActionRowBuilder().addComponents(emojiInput);

        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
      } else if (selectedValue === "finish") {
        await interaction.deferUpdate();

        // Finaliser la configuration et créer le panneau
        const config = await ticketConfigSchema.findOne({
          guildId: interaction.guild.id,
        });
        if (!config) {
          return interaction.followUp({
            content: "`❌` Configuration non trouvée.",
            ephemeral: true,
          });
        }

        // Créer le panneau de tickets
        await createTicketPanel(client, interaction.guild, config);

        const embed = new EmbedBuilder()
          .setTitle("✅ Configuration Terminée")
          .setDescription(
            `Le système de tickets a été configuré avec succès !\n\n` +
              `Le panneau de création de tickets a été créé dans le channel configuré.`,
          )
          .setColor(`#${mConfig.embedColorSuccess}`)
          .setFooter({
            iconURL: client.user.displayAvatarURL({ dynamic: true }),
            text: `${client.user.username} | Setup Ticket`,
          })
          .setTimestamp();

        await interaction.editReply({
          embeds: [embed],
          components: [],
        });

        return interaction.followUp({
          content:
            "✅ Configuration terminée ! Le panneau de tickets a été créé.",
          ephemeral: true,
        });
      }
    } catch (err) {
      console.log(
        "[ERROR]".red + " Error in ticketSetupCategories.js run function:",
      );
      console.log(err);
    }
  },
};

// Fonction pour créer le panneau de tickets
async function createTicketPanel(client, guild, config) {
  const channel = guild.channels.cache.get(config.channelId);
  if (!channel) return;

  // Supprimer l'ancien message du panel s'il existe
  if (config.panelMessageId) {
    try {
      const oldPanelMessage = await channel.messages
        .fetch(config.panelMessageId)
        .catch(() => null);
      if (oldPanelMessage) {
        await oldPanelMessage.delete();
      }
    } catch (error) {
      // Ignorer l'erreur si le message n'existe plus
    }
  }

  // Créer le selectmenu avec les catégories
  const {
    StringSelectMenuBuilder,
    ActionRowBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
  } = require("discord.js");

  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId("ticket_create")
    .setPlaceholder("🎫 Sélectionnez une catégorie pour créer un ticket")
    .setMinValues(1)
    .setMaxValues(1);

  // Ajouter les catégories
  if (config.ticketCategories && config.ticketCategories.length > 0) {
    config.ticketCategories.forEach((cat, index) => {
      categorySelect.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(cat.name)
          .setValue(cat.name)
          .setDescription(cat.description)
          .setEmoji(cat.emoji || "🎫"),
      );
    });
  } else {
    // Catégorie par défaut
    categorySelect.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Support")
        .setValue("Support")
        .setDescription("Créer un ticket de support")
        .setEmoji("🎫"),
    );
  }

  const row = new ActionRowBuilder().addComponents(categorySelect);

  // Créer l'embed du panneau
  const panelMessageText =
    config.customPanelMessage ||
    `🎫 **Système de Tickets**\n\n` +
      `Sélectionnez une catégorie ci-dessous pour créer un ticket.\n` +
      `Un membre du staff vous répondra dès que possible.`;

  const embed = new EmbedBuilder()
    .setTitle("🎫 Créer un Ticket")
    .setDescription(panelMessageText)
    .setColor(`#${mConfig.embedColorIncolor}`)
    .setFooter({
      iconURL: client.user.displayAvatarURL({ dynamic: true }),
      text: `${client.user.username} | Système de Tickets`,
    })
    .setTimestamp();

  const panelMessage = await channel.send({
    embeds: [embed],
    components: [row],
  });

  // Stocker l'ID du message du panel dans la configuration
  config.panelMessageId = panelMessage.id;
  await config.save();
}

module.exports.createTicketPanel = createTicketPanel;
