require("colors");

const ticketSchema = require("../../schemas/ticketSchema");

module.exports = async (client, message) => {
  try {
    // Ignorer les bots
    if (message.author.bot) return;

    // Vérifier si c'est un channel de ticket
    const ticket = await ticketSchema.findOne({
      channelId: message.channel.id,
      isClosed: false,
    });

    if (!ticket) return;

    // Ajouter le message au ticket
    ticket.messages.push({
      authorId: message.author.id,
      authorName: message.author.tag,
      content: message.content,
      timestamp: message.createdAt,
      attachments: message.attachments.map((att) => att.url),
      embeds: message.embeds.length > 0,
    });

    await ticket.save();
  } catch (error) {
    console.log(
      "[ERROR] Erreur lors de la capture des messages du ticket:".red,
      error,
    );
  }
};
