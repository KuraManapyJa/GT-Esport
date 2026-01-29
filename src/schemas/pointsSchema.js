const { Schema, model } = require("mongoose");

const pointsSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  game: {
    type: String,
    required: true,
    enum: ["lol", "valorant", "other"],
  },
  wins: {
    type: Number,
    default: 0,
  },
  losses: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

pointsSchema.index({ userId: 1, guildId: 1, game: 1 }, { unique: true });

module.exports = model("Points", pointsSchema);
