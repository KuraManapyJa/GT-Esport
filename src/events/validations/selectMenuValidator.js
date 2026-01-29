require("colors");

const { EmbedBuilder, MessageFlags } = require("discord.js");
const { developersId, testServerId } = require("../../config.json");
const mConfig = require("../../messageConfig.json");
const getSelectMenus = require("../../utils/getSelectMenus");

module.exports = async (client, interaction) => {
  if (!interaction.isAnySelectMenu() || interaction.customId.includes("*"))
    return;
  const selects = getSelectMenus();

  const { customId, member, guildId, guild, message, user } = interaction;

  try {
    // Chercher le select menu par customId exact ou par préfixe (pour les customId dynamiques)
    let selectObject = selects.find((select) => select.customId === customId);
    
    // Si pas trouvé, chercher par préfixe (pour les select menus avec ID dynamique)
    if (!selectObject) {
      selectObject = selects.find((select) => customId.startsWith(select.customId));
    }
    
    if (!selectObject) {
      return;
    }

    if (selectObject.devOnly && !developersId.includes(member.id)) {
      const rEmbed = new EmbedBuilder()
        .setColor(`${mConfig.embedColorError}`)
        .setDescription(`${mConfig.commandDevOnly}`);

      return interaction.reply({
        embeds: [rEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (selectObject.testMode && guildId !== testServerId) {
      const rEmbed = new EmbedBuilder()
        .setColor(`${mConfig.embedColorError}`)
        .setDescription(`${mConfig.commandTestMode}`);

      return interaction.reply({
        embeds: [rEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (selectObject.userPermissions?.length) {
      for (const permission of selectObject.userPermissions) {
        if (member.permissions.has(permission)) continue;

        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.userNoPermissions}`);

        return interaction.reply({
          embeds: [rEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (selectObject.botPermissions?.length) {
      for (const permission of selectObject.botPermissions) {
        const bot = guild.members.me;
        if (bot.permissions.has(permission)) continue;

        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.botNoPermissions}`);

        return interaction.reply({
          embeds: [rEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (message.interaction && message.interaction?.user.id !== user.id) {
      const rEmbed = new EmbedBuilder()
        .setColor(`${mConfig.embedColorError}`)
        .setDescription(`${mConfig.cannotUseSelect}`);

      return interaction.reply({
        embeds: [rEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    await selectObject.run(client, interaction);
  } catch (err) {
    console.log("[ERROR]".red + "Error in your selectMenuValidator.js file:");
    console.log(err);
  }
};
