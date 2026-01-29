const { Schema, model } = require("mongoose");

const mmrRatingSchema = new Schema({
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
  mu: {
    type: Number,
    default: 25.0, // TrueSkill mu par défaut
  },
  sigma: {
    type: Number,
    default: 8.333, // TrueSkill sigma par défaut
  },
  gamesPlayed: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

mmrRatingSchema.index({ userId: 1, guildId: 1, game: 1 }, { unique: true });

module.exports = model("MMRRating", mmrRatingSchema);
