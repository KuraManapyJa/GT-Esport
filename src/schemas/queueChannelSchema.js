const { Schema, model } = require("mongoose");

const queueChannelSchema = new Schema({
  channelId: {
    type: String,
    required: true,
    unique: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  region: {
    type: String,
    default: "euw",
  },
  game: {
    type: String,
    required: true,
    enum: ["lol", "valorant", "other"],
    default: "lol",
  },
});

module.exports = model("QueueChannel", queueChannelSchema);
