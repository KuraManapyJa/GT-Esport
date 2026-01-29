require("colors");
const LolAccount = require("../../schemas/lolAccountSchema");

/**
 * Quand un membre quitte le serveur Discord, on supprime son compte LoL lié
 * pour éviter qu'il compte encore dans l'ELO moyen du serveur.
 */
module.exports = async (client, member) => {
  try {
    const deleted = await LolAccount.deleteOne({ userId: member.id });
    if (deleted.deletedCount > 0) {
      console.log(
        `[LoL] Compte LoL supprimé pour ${member.user?.tag || member.id} après départ du serveur.`.yellow
      );
    }
  } catch (err) {
    console.log("[ERROR]".red + " Erreur dans removeLolAccountOnLeave.js:", err);
  }
};
