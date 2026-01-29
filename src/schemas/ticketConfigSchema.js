const { model, Schema } = require("mongoose");

let ticketConfigSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    categoryId: {
      type: String,
      required: true,
    },
    customPanelMessage: {
      type: String,
      default: null,
    },
    customTicketMessage: {
      type: String,
      default: null,
    },
    mentionedRoles: {
      type: [String],
      default: [],
    },
    supportRoles: {
      type: [String],
      default: [],
    },
    ticketCategories: {
      type: [
        {
          name: String,
          description: String,
          emoji: String,
        },
      ],
      default: [],
    },
    logsChannelId: {
      type: String,
      default: null,
    },
    panelMessageId: {
      type: String,
      default: null,
    },
  },
  {
    strict: false,
  },
);

module.exports = model("ticketConfig", ticketConfigSchema);
