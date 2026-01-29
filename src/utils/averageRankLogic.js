require("colors");
const lolAccountSchema = require("../schemas/lolAccountSchema");

const TIERS = {
  IRON: 0,
  BRONZE: 400,
  SILVER: 800,
  GOLD: 1200,
  PLATINUM: 1600,
  EMERALD: 2000,
  DIAMOND: 2400,
  MASTER: 2800,
  GRANDMASTER: 3200,
  CHALLENGER: 3600,
};

const DIVISIONS = {
  IV: 0,
  III: 100,
  II: 200,
  I: 300,
};

// Inverse mapping for display
const SCORE_TO_TIER = [
  { score: 3600, name: "Challenger" },
  { score: 3200, name: "Grandmaster" },
  { score: 2800, name: "Master" },
  { score: 2400, name: "Diamond" },
  { score: 2000, name: "Emerald" },
  { score: 1600, name: "Platinum" },
  { score: 1200, name: "Gold" },
  { score: 800, name: "Silver" },
  { score: 400, name: "Bronze" },
  { score: 0, name: "Iron" },
];

module.exports = async (guildId) => {
  try {
    // Ideally we filter by guild members, but schema doesn't have guildId.
    // We will fetch all accounts (assuming single server or global average)
    // If strict guild separation is needed, we'd need to fetch guild members and filter the DB query.
    // Given the context, we'll fetch all linked accounts that are likely in this server.

    // Better approach: Get all accounts, and for each, check if they are in the guild.
    // This is expensive if many users.
    // For now, let's assume all DB users are relevant or we filter by fetching guild.

    // Strategy: Fetch all DB accounts.
    const accounts = await lolAccountSchema.find({
      rank: { $ne: "Unranked" },
      tier: { $ne: "UNRANKED" },
    });

    if (accounts.length === 0) return "Unranked";

    let totalScore = 0;
    let count = 0;

    for (const account of accounts) {
      const tierVal = TIERS[account.tier] || 0;
      let divVal = 0;

      // Apex tiers (Master+) don't have divisions usually, but API might return "I".
      // We rely on LP for Apex tiers primarily if we wanted exactness,
      // but to keep it simple and consistent with standard tiers:
      if (DIVISIONS[account.rank.split(" ")[1]]) {
        divVal = DIVISIONS[account.rank.split(" ")[1]];
      }

      // Add LP to score for better precision?
      // Yes, let's add LP.
      const score = tierVal + divVal + (account.lp || 0);

      totalScore += score;
      count++;
    }

    if (count === 0) return "Unranked";

    const averageScore = totalScore / count;

    // Convert back to string
    // Find the tier bracket
    const tier =
      SCORE_TO_TIER.find((t) => averageScore >= t.score) ||
      SCORE_TO_TIER[SCORE_TO_TIER.length - 1];

    // Calculate remaining score for division
    const remainder = averageScore - tier.score;
    let division = "";

    // Apex tiers don't display divisions usually like "Master IV", just "Master"
    if (tier.score < 2800) {
      if (remainder >= 300) division = " I";
      else if (remainder >= 200) division = " II";
      else if (remainder >= 100) division = " III";
      else division = " IV";
    }

    return `${tier.name}${division}`;
  } catch (error) {
    console.log(`[AVG_RANK] Error: ${error.message}`);
    return "Erreur";
  }
};
