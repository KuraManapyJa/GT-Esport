const lolGuildConfigSchema = require("../schemas/lolGuildConfigSchema");
const getAverageRank = require("./averageRankLogic");

/**
 * Updates the Average Rank Channel for a specific guild (or all if not specified).
 * @param {Object} client - Discord Client
 * @param {string} [targetGuildId] - Optional Guild ID to update specifically
 */
module.exports = async (client, targetGuildId = null) => {
  try {
    const query = targetGuildId
      ? { guildId: targetGuildId, averageRankChannelId: { $ne: null } }
      : { averageRankChannelId: { $ne: null } };
    const guildConfigs = await lolGuildConfigSchema.find(query);

    for (const config of guildConfigs) {
      try {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) continue;

        const channel = guild.channels.cache.get(config.averageRankChannelId);
        if (channel) {
          const avgRank = await getAverageRank(config.guildId);
          const newName = `🏆┆ Elo Moyen: ${avgRank}`;
          if (channel.name !== newName) {
            await channel.setName(newName);
            console.log(
              `[AVG_RANK_UPDATE] Updated channel ${channel.id} to "${newName}"`,
            );
          }
        }
      } catch (e) {
        console.log(
          `[AVG_RANK_UPDATE] Failed to update channel for guild ${config.guildId}: ${e.message}`,
        );
      }
    }
  } catch (e) {
    console.log(
      `[AVG_RANK_UPDATE] Error updating average rank channels: ${e.message}`,
    );
  }
};
