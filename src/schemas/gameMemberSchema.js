const { Schema, model } = require("mongoose");

const gameMemberSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  gameId: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  team: {
    type: String,
    enum: ["blue", "red"],
    required: true,
  },
  ready: {
    type: Boolean,
    default: false,
  },
  queueMessageId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
});

gameMemberSchema.index({ userId: 1, gameId: 1 }, { unique: true });

module.exports = model("GameMember", gameMemberSchema);
