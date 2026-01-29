require("colors");

const { EmbedBuilder, MessageFlags } = require("discord.js");
const { developersId, testServerId } = require("../../config.json");
const mConfig = require("../../messageConfig.json");
const getButtons = require("../../utils/getButtons");

module.exports = async (client, interaction) => {
  if (!interaction.isButton() || interaction.customId.includes("*")) return;
  const buttons = getButtons();

  const { customId, member, guildId, guild, message, user } = interaction;

  try {
    // Chercher le bouton par customId exact ou par préfixe (pour les customId dynamiques)
    let buttonObject = buttons.find((button) => button.customId === customId);
    
    // Si pas trouvé, chercher par préfixe (pour les boutons avec ID dynamique)
    if (!buttonObject) {
      buttonObject = buttons.find((button) => customId.startsWith(button.customId));
    }
    
    if (!buttonObject) return;

    if (buttonObject.devOnly && !developersId.includes(member.id)) {
      const rEmbed = new EmbedBuilder()
        .setColor(`${mConfig.embedColorError}`)
        .setDescription(`${mConfig.commandDevOnly}`);

      return interaction.reply({ embeds: [rEmbed], flags: MessageFlags.Ephemeral });
    };

    if (buttonObject.testMode && guildId !== testServerId) {
      const rEmbed = new EmbedBuilder()
        .setColor(`${mConfig.embedColorError}`)
        .setDescription(`${mConfig.commandTestMode}`);

      return interaction.reply({ embeds: [rEmbed], flags: MessageFlags.Ephemeral });
    };

    if (buttonObject.userPermissions?.length) {
      for (const permission of buttonObject.userPermissions) {
        if (member.permissions.has(permission)) continue;

        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.userNoPermissions}`);

        return interaction.reply({ embeds: [rEmbed], flags: MessageFlags.Ephemeral });
      };
    };

    if (buttonObject.botPermissions?.length) {
      for (const permission of buttonObject.botPermissions) {
        const bot = guild.members.me;
        if (bot.permissions.has(permission)) continue;

        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.botNoPermissions}`);

        return interaction.reply({ embeds: [rEmbed], flags: MessageFlags.Ephemeral });
      };
    };

    if (message.interaction && message.interaction?.user.id !== user.id) {
      const rEmbed = new EmbedBuilder()
        .setColor(`${mConfig.embedColorError}`)
        .setDescription(`${mConfig.cannotUseButton}`);

      return interaction.reply({ embeds: [rEmbed], flags: MessageFlags.Ephemeral });
    };

    await buttonObject.run(client, interaction);
  } catch (err) {
    console.log("[ERROR]".red + "Error in your buttonValidator.js file:");
    console.log(err);
  };
};