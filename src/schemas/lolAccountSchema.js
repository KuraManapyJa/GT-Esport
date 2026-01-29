const { Schema, model } = require("mongoose");

const lolAccountSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    gameName: {
      type: String,
      required: true,
    },
    tagLine: {
      type: String,
      required: true,
    },
    // Champ legacy pour compatibilité
    summonerName: {
      type: String,
      default: null,
    },
    region: {
      type: String,
      required: true,
      default: "euw1", // Europe West par défaut
    },
    puuid: {
      type: String,
      default: null,
    },
    summonerId: {
      type: String,
      default: null,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    rank: {
      type: String,
      default: "Unranked",
    },
    tier: {
      type: String,
      default: "UNRANKED",
    },
    lp: {
      type: Number,
      default: 0,
    },
  },
  {
    strict: false,
  }
);

module.exports = model("LolAccount", lolAccountSchema);
