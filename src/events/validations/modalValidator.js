require("colors");

const { EmbedBuilder } = require("discord.js");
const { developersId, testServerId } = require("../../config.json");
const mConfig = require("../../messageConfig.json");
const getModals = require("../../utils/getModals");

module.exports = async (client, interaction) => {
  if (!interaction.isModalSubmit()) return;
  const modals = getModals();

  try {
    // Chercher un modal avec un customId exact ou qui commence par le customId (pour les IDs dynamiques)
    // console.log(`[DEBUG] Validating modal: ${interaction.customId}`);

    // Log loaded modals details for debugging
    // console.log(`[DEBUG] Loaded modals:`, modals.map(m => m.customId));

    const modalObject = modals.find((modal) => {
      if (modal.customId === interaction.customId) return true;
      // Pour les customIds dynamiques comme "ticket_close_confirm_123456", vérifier si customId commence par le préfixe
      if (interaction.customId.startsWith(modal.customId + "_")) return true;
      return false;
    });

    if (!modalObject) {
      //console.log(`[DEBUG] No modal handler found for ${interaction.customId}`);
      return;
    }

    if (modalObject.devOnly) {
      if (!developersId.includes(interaction.member.id)) {
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.commandDevOnly}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      }
    }

    if (modalObject.testMode) {
      if (interaction.guild.id !== testServerId) {
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.commandTestMode}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      }
    }

    if (modalObject.userPermissions?.length) {
      for (const permission of modalObject.userPermissions) {
        if (interaction.member.permissions.has(permission)) {
          continue;
        }
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.userNoPermissions}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      }
    }

    if (modalObject.botPermissions?.length) {
      for (const permission of modalObject.botPermissions) {
        const bot = interaction.guild.members.me;
        if (bot.permissions.has(permission)) {
          continue;
        }
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.botNoPermissions}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      }
    }

    await modalObject.run(client, interaction);
  } catch (err) {
    console.log(
      `Une erreur s'est produite lors de la validation des commandes modales ! ${err}`
        .red,
    );
  }
};
