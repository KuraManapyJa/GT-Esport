const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActivityType,
  EmbedBuilder,
  Client,
  ChatInputCommandInteraction,
} = require("discord.js");
const botStatuses = require("../../schemas/botPresenceSchema");
const mConfig = require("../../messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("presence")
    .setDescription("Gérer l'activité et le statut des bots.")
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Ajouter une nouvelle présence.")
        .addStringOption((o) =>
          o
            .setName("name")
            .setDescription("Le nom de l'activité.")
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("type")
            .setDescription("Le type.")
            .setRequired(true)
            .addChoices(
              { name: "Playing", value: `${ActivityType.Playing}` },
              { name: "Listening", value: `${ActivityType.Listening}` },
              { name: "Watching", value: `${ActivityType.Watching}` },
              { name: "Competing", value: `${ActivityType.Competing}` },
              { name: "Custom", value: `${ActivityType.Custom}` },
            ),
        )
        .addStringOption((o) =>
          o
            .setName("status")
            .setDescription("Le statut à ajouter.")
            .addChoices(
              { name: "Online", value: "online" },
              { name: "Idle", value: "idle" },
              { name: "Do Not Disturb", value: "dnd" },
              { name: "Invisible", value: "invisible" },
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Supprime la dernière activité ajoutée au robot."),
    )
    .addSubcommand((s) =>
      s
        .setName("list")
        .setDescription("Dresser la liste de toutes les activités des robots."),
    )
    .toJSON(),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.SendMessages],
  devOnly: true,
  /**
   * @param { Client } client
   * @param { ChatInputCommandInteraction } interaction
   */
  run: async (client, interaction) => {
    const subcommand = interaction.options.getSubcommand();
    const data = await botStatuses.findOne({ ClientID: client.user.id });

    switch (subcommand) {
      case "add":
        const name = interaction.options.getString("name");
        const type = interaction.options.getString("type");
        const status = interaction.options.getString("status");

        if (!data) {
          await botStatuses.create({
            ClientID: client.user.id,
            Presences: [
              {
                Name: name,
                Type: parseInt(type),
              },
            ],
          });
        } else {
          await botStatuses.findOneAndUpdate(
            { ClientID: client.user.id },
            {
              $push: {
                Presences: {
                  Activity: [{ Name: name, Type: parseInt(type) }],
                  Status: status,
                },
              },
            },
          );
        }
        return interaction.reply({
          content: `\`✅\` L'activité a été ajoutée avec succès \`${name}\` au bot !`,
          ephemeral: true,
        });
      case "remove":
        if (!data) {
          return interaction.reply({
            content: `\`❌\` Il n'y a pas d'activités à supprimer !`,
            ephemeral: true,
          });
        }

        await botStatuses.findOneAndUpdate(
          {
            ClientID: client.user.id,
          },
          {
            $pop: {
              Presences: 1,
            },
          },
        );
        return interaction.reply({
          content: `\`✅\` La dernière activité du bot a été supprimée avec succès !`,
          ephemeral: true,
        });

      case "list":
        if (!data) {
          return interaction.reply({
            content: `\`❌\` Il n'y a pas d'activités à énumérer !`,
            ephemeral: true,
          });
        }

        const presences = data.Presences;

        const rEmbed = new EmbedBuilder()
          .setTitle(`\`⭐\` Activités du bot`)
          .setColor(mConfig.embedColorIncolor)
          .setFooter({
            iconURL: client.user.displayAvatarURL({ dynamic: true }),
            text: `${client.user.username} | Liste d'activités`,
          });

        const activityType = [
          "Playing",
          "Listening",
          "Watching",
          "Competing",
          "Custom",
        ];
        const activityStatus = {
          online: "Online",
          idle: "Idle",
          dnd: "Do Not Disturb",
          invisible: "Invisible",
        };

        presences.forEach((presence, index) => {
          rEmbed.addFields({
            name: `\`${index + 1}\` - \`${presence.Activity[0].Name}\``,
            value: `**Type:** ${
              activityType[presence.Activity[0].Type]
            }\n**Status:** ${activityStatus[presence.Status]}`,
          });
        });

        return interaction.reply({ embeds: [rEmbed], ephemeral: true });
    }
  },
};
