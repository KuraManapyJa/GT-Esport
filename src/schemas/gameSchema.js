const { Schema, model } = require("mongoose");

const gameSchema = new Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  queueChannelId: {
    type: String,
    required: true,
  },
  queueMessageId: {
    type: String,
    default: null,
  },
  lobbyChannelId: {
    type: String,
    default: null,
  },
  discussionChannelId: {
    type: String,
    default: null,
  },
  redVoiceChannelId: {
    type: String,
    default: null,
  },
  blueVoiceChannelId: {
    type: String,
    default: null,
  },
  redRoleId: {
    type: String,
    default: null,
  },
  blueRoleId: {
    type: String,
    default: null,
  },
  game: {
    type: String,
    required: true,
    enum: ["lol", "valorant", "other"],
  },
  status: {
    type: String,
    enum: ["queue", "ready", "in_progress", "finished"],
    default: "queue",
  },
  gameMode: {
    type: String,
    enum: ["ranked", "rosters", "captain", "casual"],
    default: "casual",
  },
  mmrEnabled: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  finishedAt: {
    type: Date,
    default: null,
  },
});

module.exports = model("Game", gameSchema);
