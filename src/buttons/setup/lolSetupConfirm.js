const { 
  EmbedBuilder, 
  ButtonBuilder, 
  ActionRowBuilder, 
  ButtonStyle, 
  MessageFlags 
} = require("discord.js");
const mConfig = require("../../messageConfig.json");

module.exports = {
  customId: "lol_setup_confirm",
  run: async (client, interaction) => {
    try {
      // customId: lol_setup_confirm_CHANNELID_ROLEID
      const parts = interaction.customId.split("_");
      const channelId = parts[3];
      const roleId = parts[4];

      const channel = interaction.guild.channels.cache.get(channelId);
      const role = interaction.guild.roles.cache.get(roleId);

      if (!channel || !role) {
         return interaction.update({
             content: "❌ Salon ou rôle introuvable (peut-être supprimé ?). Recommencez.",
             components: [],
             embeds: []
         });
      }

      // Send the Public Embed
      const publicEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorIncolor || "313338")
        .setTitle("🔗 Inscription League of Legends") 
        .setDescription("Cliquez sur **S'enregistrer** puis entrez votre pseudo League of Legends.") 
        .setImage("https://media.discordapp.net/attachments/1342471365177118811/1342525166416167015/GT_Banniere_LoL.png?ex=67bc9816&is=67bb4696&hm=9b071727768e14237890dc77926135272a2754641974797133917a151b75fa63&=&format=webp&quality=lossless&width=1440&height=482")
        .setFooter({ text: mConfig.footerText || "GT Esport" });

      const registerBtn = new ButtonBuilder()
        .setCustomId(`lol_reg_${roleId}`)
        .setLabel("S'enregistrer")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(registerBtn);

      await channel.send({
        embeds: [publicEmbed],
        components: [row],
      });

      // Update Ephemeral to Success
      const successEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorSuccess || "16c60c")
        .setTitle("✅ Configuration Terminée")
        .setDescription("Le message d'inscription a été envoyé avec succès.")
        .addFields(
          { name: "Salon", value: `${channel}`, inline: true },
          { name: "Rôle", value: `${role}`, inline: true }
        );

      await interaction.update({
        embeds: [successEmbed],
        components: []
      });

    } catch (err) {
      console.log("[ERROR] lolSetupConfirm:", err);
      // Try to report error user-side
      await interaction.reply({ 
          content: "❌ Configuration échouée.", 
          flags: MessageFlags.Ephemeral 
      }).catch(() => {}); 
    }
  }
};
