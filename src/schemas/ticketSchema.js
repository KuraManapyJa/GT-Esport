const { model, Schema } = require("mongoose");

let ticketSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "Autre",
    },
    claimedBy: {
      type: String,
      default: null,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: String,
      default: null,
    },
    messages: {
      type: [
        {
          authorId: String,
          authorName: String,
          content: String,
          timestamp: Date,
          attachments: [String],
        },
      ],
      default: [],
    },
  },
  {
    strict: false,
  },
);

module.exports = model("ticket", ticketSchema);
