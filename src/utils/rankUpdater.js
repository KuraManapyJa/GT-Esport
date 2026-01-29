require("colors");
const lolAccountSchema = require("../schemas/lolAccountSchema");
const RiotAPI = require("./riotAPI");

/**
 * Update rank and nickname for a specific user.
 * @param {Object} client - Discord Client
 * @param {string} userId - Discord User ID
 * @returns {Promise<boolean>} success
 */
module.exports = async (client, userId) => {
  try {
    const account = await lolAccountSchema.findOne({ userId });
    if (!account || !account.puuid) return false;

    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) return false;

    const riotAPI = new RiotAPI(apiKey);
    
    // Fetch fresh rank stats
    let rankString = "Unranked";
    let tier = "UNRANKED";
    let lp = 0;

    try {
      const rankStats = await riotAPI.getRankedStatsByPuuid(account.puuid, account.region);
      const soloDuo = rankStats.find(e => e.queueType === "RANKED_SOLO_5x5");
      const flex = rankStats.find(e => e.queueType === "RANKED_FLEX_SR" || e.queueType === "RANKED_FLEX_5x5");
      const mainStat = soloDuo || flex;

      if (mainStat) {
        rankString = `${mainStat.tier} ${mainStat.rank}`;
        tier = mainStat.tier;
        lp = mainStat.leaguePoints;
      }
    } catch (err) {
      console.log(`[RANK_UPDATER] Failed to fetch stats for ${account.gameName}: ${err.message}`);
      return false;
    }

    // Check if rank changed or if we need to enforce roles/nickname
    // We'll update regardless of rank change to ensure roles/nicknames are always correct (e.g. if config changed)
    // Optimization: Check lastUpdated? user might spam? 
    // For now, let's keep the check for valid rank, but maybe remove the strictly "if changed" block or move logic out.
    // Actually, the user asked for role updates. Let's do it.

      account.rank = rankString;
      account.tier = tier;
      account.lp = lp;
      account.lastUpdated = new Date();
      await account.save(); // Save always to be safe or optimize

      const lolGuildConfigSchema = require("../schemas/lolGuildConfigSchema");

      try {
        for (const [guildId, guild] of client.guilds.cache) {
          try {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) continue;
            
            // 1. Update Nickname (Discord Name | Rank)
            if (member.manageable && member.id !== guild.ownerId) {
               // Use Global Name (Display Name) or Username
               const discordName = member.user.globalName || member.user.username;
               const newNickname = `${discordName} | ${rankString}`;
               
               if (member.nickname !== newNickname) {
                 await member.setNickname(newNickname.substring(0, 32));
               }
            }

            // 2. Update Roles
            const guildConfig = await lolGuildConfigSchema.findOne({ guildId: guild.id });
            if (guildConfig && guildConfig.rankRoles) {
               // Get mapped role for current tier
               // tier is like "GOLD", "PLATINUM"
               const roleId = guildConfig.rankRoles.get(tier);
               
               if (roleId) {
                 const role = guild.roles.cache.get(roleId);
                 if (role && role.editable && !member.roles.cache.has(roleId)) {
                   await member.roles.add(role);
                 }
               }
               
               // Remove other rank roles?
               // Ensure user doesn't have Gold AND Silver if they promoted.
               // Iterate all configured rank roles
               for (const [rTier, rRoleId] of guildConfig.rankRoles) {
                 if (rTier !== tier && member.roles.cache.has(rRoleId)) {
                    const rRole = guild.roles.cache.get(rRoleId);
                    if (rRole && rRole.editable) {
                      await member.roles.remove(rRole);
                    }
                 }
               }
            }

          } catch (e) {
            // console.log(`[RANK_UPDATER] Error processing guild ${guild.name}: ${e.message}`);
          }
        }
      } catch (err) {
         // console.log(`[RANK_UPDATER] Nickname update global error: ${err.message}`);
      }
      return true;

    return false; // No change
  } catch (error) {
    console.log(`[RANK_UPDATER] Global error: ${error.message}`);
    return false;
  }
};
