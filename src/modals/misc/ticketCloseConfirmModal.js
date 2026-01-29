require("colors");

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const ticketSchema = require("../../schemas/ticketSchema");
const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
const mConfig = require("../../messageConfig.json");
const fs = require("fs");
const path = require("path");

module.exports = {
  customId: "ticket_close_confirm",
  testMode: false,
  devOnly: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    console.log(`[DEBUG] Ticket close modal started for user ${interaction.user.id}`);
    try {
      await interaction.deferReply();

      // Le customId est "ticket_close_confirm_USERID"
      const parts = interaction.customId.split("_");
      const userId = parts[parts.length - 1];
      const reason =
        interaction.fields.getTextInputValue("close_reason").trim() ||
        "Aucune raison spécifiée";

      // Récupérer le ticket
      const ticket = await ticketSchema.findOne({
        channelId: interaction.channel.id,
        isClosed: false,
      });

      if (!ticket) {
        return interaction.editReply({
          content: "`❌` Ticket non trouvé.",
        });
      }

      // Récupérer tous les messages du ticket avant fermeture
      const messages = [];
      let lastMessageId = null;
      let hasMore = true;

      while (hasMore) {
        const options = { limit: 100 };
        if (lastMessageId) {
          options.before = lastMessageId;
        }

        const fetchedMessages =
          await interaction.channel.messages.fetch(options);

        if (fetchedMessages.size === 0) {
          hasMore = false;
        } else {
          fetchedMessages.forEach((msg) => {
            messages.push({
              authorId: msg.author.id,
              authorName: msg.author.tag,
              content: msg.content,
              timestamp: msg.createdAt,
              attachments: msg.attachments.map((att) => att.url),
              embeds: msg.embeds.length > 0,
            });
          });

          lastMessageId = fetchedMessages.last().id;
          if (fetchedMessages.size < 100) {
            hasMore = false;
          }
        }
      }

      // Inverser pour avoir les messages dans l'ordre chronologique
      messages.reverse();

      // Mettre à jour le ticket avec les messages
      ticket.messages = messages;
      ticket.isClosed = true;
      ticket.closedAt = new Date();
      ticket.closedBy = interaction.user.id;
      await ticket.save();

      // Créer le fichier HTML de log
      const logHtml = generateTicketLogHTML(
        ticket,
        messages,
        reason,
        client,
        interaction.guild,
      );

      // Créer le dossier logs s'il n'existe pas (dans le dossier du projet)
      const logsDir = path.join(process.cwd(), "logs", "tickets");
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Sauvegarder le log
      const logFileName = `ticket-${ticket.channelId}-${Date.now()}.html`;
      const logFilePath = path.join(logsDir, logFileName);
      fs.writeFileSync(logFilePath, logHtml);

      // Récupérer la configuration pour le channel des logs
      const ticketConfigSchema = require("../../schemas/ticketConfigSchema");
      const config = await ticketConfigSchema.findOne({
        guildId: interaction.guild.id,
      });

      // Envoyer le log dans le channel configuré si disponible
      if (config && config.logsChannelId) {
        const logsChannel = interaction.guild.channels.cache.get(
          config.logsChannelId,
        );
        if (logsChannel) {
          try {
            // Créer un embed pour le log dans le channel
            const logEmbed = new EmbedBuilder()
              .setTitle("📋 Log du Ticket Fermé")
              .setDescription(
                `**Ticket ID:** \`${ticket.channelId}\`\n` +
                  `**Créateur:** <@${ticket.userId}>\n` +
                  `**Catégorie:** ${ticket.category}\n` +
                  `**Fermé par:** ${interaction.user}\n` +
                  `**Date de fermeture:** <t:${Math.floor(
                    ticket.closedAt.getTime() / 1000,
                  )}:F>\n` +
                  `**Raison:** ${reason}\n` +
                  `**Nombre de messages:** ${messages.length}\n\n` +
                  `📄 Le fichier HTML du log est attaché ci-dessus.`,
              )
              .setColor(`#${mConfig.embedColorIncolor}`)
              .setFooter({
                iconURL: client.user.displayAvatarURL({ dynamic: true }),
                text: `${client.user.username} | Log Ticket`,
              })
              .setTimestamp();

            await logsChannel.send({
              embeds: [logEmbed],
              files: [
                {
                  attachment: Buffer.from(logHtml, "utf8"),
                  name: logFileName,
                },
              ],
            });
          } catch (error) {
            console.log(
              "[ERROR] Erreur lors de l'envoi du log dans le channel:".red,
              error,
            );
          }
        }
      }

      // Créer l'embed de fermeture
      const closeEmbed = new EmbedBuilder()
        .setTitle("🔒 Ticket Fermé")
        .setDescription(
          `Ce ticket a été fermé par ${interaction.user}.\n\n` +
            `**Raison:** ${reason}\n\n` +
            `Le channel sera supprimé dans 10 secondes.`,
        )
        .setColor(`#${mConfig.embedColorError}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Ticket Fermé`,
        })
        .setTimestamp();

      await interaction.channel.send({ embeds: [closeEmbed] });

      // Réinitialiser le selectmenu du panel pour l'utilisateur qui a fermé le ticket
      if (config && config.panelMessageId && config.channelId) {
        try {
          const panelChannel = interaction.guild.channels.cache.get(
            config.channelId,
          );
          if (panelChannel) {
            const panelMessage = await panelChannel.messages
              .fetch(config.panelMessageId)
              .catch(() => null);
            if (panelMessage) {
              // Modifier le message pour réinitialiser le selectmenu
              // On recrée le selectmenu avec les mêmes options pour le réinitialiser
              const {
                StringSelectMenuBuilder,
                ActionRowBuilder,
                StringSelectMenuOptionBuilder,
              } = require("discord.js");

              const categorySelect = new StringSelectMenuBuilder()
                .setCustomId("ticket_create")
                .setPlaceholder(
                  "🎫 Sélectionnez une catégorie pour créer un ticket",
                )
                .setMinValues(1)
                .setMaxValues(1);

              // Ajouter les catégories
              if (
                config.ticketCategories &&
                config.ticketCategories.length > 0
              ) {
                config.ticketCategories.forEach((cat) => {
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

              // Modifier le message pour réinitialiser le selectmenu
              await panelMessage.edit({
                embeds: panelMessage.embeds,
                components: [row],
              });
            }
          }
        } catch (error) {
          console.log(
            "[ERROR] Impossible de réinitialiser le panel:".red,
            error,
          );
        }
      }

      // Supprimer le channel après 10 secondes
      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (error) {
          console.log("[ERROR] Impossible de supprimer le channel:".red, error);
        }
      }, 10000);

      const embed = new EmbedBuilder()
        .setTitle("✅ Ticket Fermé")
        .setDescription(
          `Le ticket a été fermé avec succès.\n\n` +
            `**Log sauvegardé:** \`${logFileName}\`\n` +
            `**Chemin:** \`logs/tickets/${logFileName}\`\n\n` +
            `${
              config && config.logsChannelId
                ? `📋 Le log a été envoyé dans <#${config.logsChannelId}>`
                : `📄 Le log a été sauvegardé localement dans \`logs/tickets/\``
            }`,
        )
        .setColor(`#${mConfig.embedColorSuccess}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Ticket Fermé`,
        })
        .setTimestamp();

      return interaction.editReply({
        embeds: [embed],
      });
    } catch (err) {
      console.log(
        "[ERROR]".red + " Error in ticketCloseConfirmModal.js run function:",
      );
      console.log(err);
      const errorMessage = `❌ Une erreur s'est produite : \n\`\`\`${err.message}\`\`\``;
      
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: errorMessage });
      } else {
        return interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};

// Fonction pour générer le HTML du log
function generateTicketLogHTML(ticket, messages, reason, client, guild) {
  const ticketUser = guild.members.cache.get(ticket.userId);
  const closedBy = guild.members.cache.get(ticket.closedBy);

  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Ticket - ${ticket.channelId}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #2f3136;
            color: #dcddde;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #36393f;
            border-radius: 8px;
            padding: 20px;
        }
        .header {
            border-bottom: 2px solid #7289da;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #7289da;
            margin: 0;
        }
        .info {
            background: #2f3136;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .info-item {
            margin: 5px 0;
        }
        .message {
            background: #2f3136;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 15px;
            border-left: 3px solid #7289da;
        }
        .message-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-weight: bold;
        }
        .message-author {
            color: #7289da;
        }
        .message-time {
            color: #72767d;
            font-size: 0.9em;
        }
        .message-content {
            margin-top: 10px;
            line-height: 1.5;
        }
        .attachment {
            margin-top: 10px;
            color: #7289da;
        }
        .embed {
            background: #2c2f33;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            border-left: 3px solid #7289da;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Log du Ticket</h1>
        </div>
        <div class="info">
            <div class="info-item"><strong>ID du Ticket:</strong> ${
              ticket.channelId
            }</div>
            <div class="info-item"><strong>Créateur:</strong> ${
              ticketUser ? ticketUser.user.tag : ticket.userId
            }</div>
            <div class="info-item"><strong>Catégorie:</strong> ${
              ticket.category
            }</div>
            <div class="info-item"><strong>Fermé par:</strong> ${
              closedBy ? closedBy.user.tag : ticket.closedBy
            }</div>
            <div class="info-item"><strong>Date de fermeture:</strong> ${new Date(
              ticket.closedAt,
            ).toLocaleString("fr-FR")}</div>
            <div class="info-item"><strong>Raison:</strong> ${reason}</div>
            <div class="info-item"><strong>Nombre de messages:</strong> ${
              messages.length
            }</div>
        </div>
        <h2>Messages</h2>`;

  messages.forEach((msg) => {
    const date = new Date(msg.timestamp).toLocaleString("fr-FR");
    html += `
        <div class="message">
            <div class="message-header">
                <span class="message-author">${msg.authorName}</span>
                <span class="message-time">${date}</span>
            </div>
            <div class="message-content">${escapeHtml(
              msg.content || "*Message sans contenu*",
            )}</div>`;

    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach((att) => {
        html += `<div class="attachment">📎 <a href="${att}" target="_blank">Pièce jointe</a></div>`;
      });
    }

    if (msg.embeds) {
      html += `<div class="embed">[Embed]</div>`;
    }

    html += `</div>`;
  });

  html += `
    </div>
</body>
</html>`;

  return html;
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

module.exports.generateTicketLogHTML = generateTicketLogHTML;
