const { Schema, model } = require("mongoose");

const lolGuildConfigSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  averageRankChannelId: {
    type: String,
    default: null,
  },
  rankRoles: {
    type: Map,
    of: String, // Rank Name (e.g. "GOLD") -> Role ID
    default: {},
  }
});

module.exports = model("LolGuildConfig", lolGuildConfigSchema);
