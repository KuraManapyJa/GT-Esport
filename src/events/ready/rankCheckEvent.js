const lolAccountSchema = require("../../schemas/lolAccountSchema");
const updateRank = require("../../utils/rankUpdater");
const updateAverageRankChannel = require("../../utils/updateAverageRankChannel");

module.exports = async (client) => {
  const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

  const runCheck = async () => {
    console.log("[RANK_CHECK] Starting periodic rank check...");
    const accounts = await lolAccountSchema.find({});
    
    let updatedCount = 0;
    for (const account of accounts) {
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      const changed = await updateRank(client, account.userId);
      if (changed) updatedCount++;
    }
    console.log(`[RANK_CHECK] Completed. Updated ${updatedCount}/${accounts.length} accounts.`);

    // Update Average Rank Channels
    await updateAverageRankChannel(client);
  };

  // Run immediately on boot after small delay
  setTimeout(runCheck, 10000);

  // Set interval
  setInterval(runCheck, CHECK_INTERVAL);
};
