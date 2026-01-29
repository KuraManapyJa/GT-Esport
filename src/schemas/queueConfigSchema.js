const { Schema, model } = require("mongoose");

const queueConfigSchema = new Schema({
  guildId: {
    type: String,
    required: true,
  },
  game: {
    type: String,
    required: true,
    enum: ["lol", "valorant", "other"],
  },
  queueChannelId: {
    type: String,
    required: true,
  },
  matchHistoryChannelId: {
    type: String,
    default: null,
  },
  leaderboardChannelId: {
    type: String,
    default: null,
  },
  adminLogsChannelId: {
    type: String,
    default: null,
  },
  inProgressChannelId: {
    type: String,
    default: null,
  },
  region: {
    type: String,
    default: "euw",
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
});

queueConfigSchema.index({ guildId: 1, game: 1 }, { unique: true });

module.exports = model("QueueConfig", queueConfigSchema);
