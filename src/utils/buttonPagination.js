const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

module.exports = async (interaction, pages, time = 30 * 1000) => {
  try {
    if (!interaction || !pages || !pages.length > 0)
      throw new Error("Arguments non valables");

    await interaction.deferReply();

    if (pages.length === 1) {
      return await interaction.editReply({
        embeds: pages,
        components: [],
        fetchReply: true,
      });
    }

    const prev = new ButtonBuilder()
      .setCustomId("précédent")
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true);

    const home = new ButtonBuilder()
      .setCustomId("domicile")
      .setEmoji("🏠")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const next = new ButtonBuilder()
      .setCustomId("suivant")
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Primary);

    const buttons = new ActionRowBuilder().addComponents([prev, home, next]);
    let index = 0;

    const msg = await interaction.editReply({
      embeds: [pages[index]],
      components: [buttons],
      fetchReply: true,
    });

    const mc = await msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time,
    });

    mc.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id)
        return i.reply({
          content: "Vous n'avez pas le droit de faire cela !",
          ephemeral: true,
        });

      await i.deferUpdate({});

      if (i.customId === "précédent") {
        if (index > 0) index--;
      } else if (i.customId === "domicile") {
        index = 0;
      } else if (i.customId === "suivant") {
        if (index < pages.length - 1) index++;
      }

      if (index === 0) {
        prev.setDisabled(true);
        home.setDisabled(true);
      } else {
        prev.setDisabled(false);
        home.setDisabled(false);
      }

      if (index === pages.length - 1) {
        next.setDisabled(true);
      } else {
        next.setDisabled(false);
      }

      await msg.edit({
        embeds: [pages[index]],
        components: [buttons],
      });

      mc.resetTimer();

      mc.on("end", async () => {
        await msg.edit({
          embeds: [pages[index]],
          components: [],
        });
      });

      return msg;
    });
  } catch (err) {
    console.log(err);
  }
};
