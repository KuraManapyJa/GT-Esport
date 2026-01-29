require("colors");
const axios = require("axios");

// Configuration des régions Riot Games
const REGIONS = {
  euw1: { platform: "euw1", regional: "europe" },
  eun1: { platform: "eun1", regional: "europe" },
  na1: { platform: "na1", regional: "americas" },
  kr: { platform: "kr", regional: "asia" },
  jp1: { platform: "jp1", regional: "asia" },
  br1: { platform: "br1", regional: "americas" },
  la1: { platform: "la1", regional: "americas" },
  la2: { platform: "la2", regional: "americas" },
  oc1: { platform: "oc1", regional: "asia" },
  tr1: { platform: "tr1", regional: "europe" },
  ru: { platform: "ru", regional: "europe" },
};

class RiotAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURLs = {
      platform: (region) => `https://${region}.api.riotgames.com`,
      regional: (region) => `https://${region}.api.riotgames.com`,
    };
  }

  /**
   * Retry avec backoff exponentiel pour gérer les rate limits
   */
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] 
            ? parseInt(error.response.headers['retry-after']) * 1000 
            : baseDelay * Math.pow(2, attempt);
          
          console.log(`[RIOT_API] Rate limit atteint, attente de ${retryAfter}ms (tentative ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          continue;
        }
        throw error;
      }
    }
    throw new Error("Trop de tentatives, rate limit toujours actif");
  }

  /**
   * Récupère les informations d'un compte par Riot ID (gameName#tagLine)
   */
  async getAccountByRiotId(gameName, tagLine, region = "euw1") {
    try {
      const regional = REGIONS[region]?.regional || "europe";
      const url = `https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
      
      console.log(`[RIOT_API] getAccountByRiotId: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          "X-Riot-Token": this.apiKey,
        },
      });

      console.log(`[RIOT_API] Compte trouvé: ${response.data.gameName}#${response.data.tagLine}`);
      return response.data; // Retourne { puuid, gameName, tagLine }
    } catch (error) {
      console.log(`[RIOT_API] Erreur getAccountByRiotId: ${error.response?.status} - ${error.message}`);
      if (error.response?.status === 404) {
        throw new Error("Compte Riot introuvable - vérifiez votre Riot ID");
      }
      if (error.response?.status === 403) {
        throw new Error("Clé API Riot invalide ou expirée (régénérez-la sur developer.riotgames.com)");
      }
      throw error;
    }
  }

  /**
   * Récupère les informations d'un compte par PUUID
   * Permet de suivre les changements de Riot ID (gameName#tagLine) même si le joueur renomme son compte.
   */
  async getAccountByPuuid(puuid, region = "euw1") {
    try {
      const regional = REGIONS[region]?.regional || "europe";
      const url = `https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${encodeURIComponent(
        puuid
      )}`;

      console.log(`[RIOT_API] getAccountByPuuid: ${url}`);

      const response = await axios.get(url, {
        headers: {
          "X-Riot-Token": this.apiKey,
        },
      });

      console.log(
        `[RIOT_API] Compte (via PUUID) : ${response.data.gameName}#${response.data.tagLine}`
      );
      return response.data; // { puuid, gameName, tagLine }
    } catch (error) {
      console.log(
        `[RIOT_API] Erreur getAccountByPuuid: ${error.response?.status} - ${error.message}`
      );
      if (error.response?.status === 404) {
        throw new Error(
          "Compte Riot introuvable via PUUID - le compte a peut-être été supprimé ou déplacé"
        );
      }
      if (error.response?.status === 403) {
        throw new Error(
          "Clé API Riot invalide ou expirée (régénérez-la sur developer.riotgames.com)"
        );
      }
      throw error;
    }
  }

  /**
   * Récupère les informations d'un summoner par son PUUID
   */
  async getSummonerByPuuid(puuid, region = "euw1") {
    try {
      const platform = REGIONS[region]?.platform || region;
      const url = `${this.baseURLs.platform(platform)}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
      
      console.log(`[RIOT_API] getSummonerByPuuid: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          "X-Riot-Token": this.apiKey,
        },
      });

      console.log(`[RIOT_API] Réponse summoner:`, JSON.stringify(response.data));
      
      // Si l'ID n'est pas dans la réponse, essayer de le récupérer via un match récent
      if (!response.data.id) {
        console.log(`[RIOT_API] ID manquant, tentative via historique de match...`);
        const summonerId = await this.getSummonerIdFromMatch(puuid, region);
        if (summonerId) {
          response.data.id = summonerId;
        }
      }
      
      return response.data;
    } catch (error) {
      console.log(`[RIOT_API] Erreur getSummonerByPuuid: ${error.response?.status} - ${error.message}`);
      if (error.response?.status === 404) {
        throw new Error("Ce compte n'a jamais joué à League of Legends sur cette région");
      }
      if (error.response?.status === 403) {
        throw new Error("Clé API Riot invalide ou expirée (régénérez-la sur developer.riotgames.com)");
      }
      throw error;
    }
  }

  /**
   * Récupère le summonerId depuis un match récent (workaround car l'API ne le retourne plus)
   */
  async getSummonerIdFromMatch(puuid, region = "euw1") {
    try {
      console.log(`[RIOT_API] Tentative récupération summonerId via match...`);
      
      // Récupérer un match récent avec retry
      const matchIds = await this.getMatchHistory(puuid, region, 1);
      if (matchIds.length === 0) {
        console.log(`[RIOT_API] Aucun match trouvé pour extraire le summonerId`);
        return null;
      }

      // Récupérer les détails du match avec retry
      const match = await this.getMatchDetails(matchIds[0], region);
      
      // Trouver le participant correspondant au PUUID
      const participant = match.info.participants.find(p => p.puuid === puuid);
      
      if (participant?.summonerId) {
        console.log(`[RIOT_API] summonerId trouvé via match: ${participant.summonerId}`);
        return participant.summonerId;
      }
      
      console.log(`[RIOT_API] summonerId non trouvé dans le match`);
      return null;
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`[RIOT_API] Rate limit lors de la récupération du summonerId`);
      } else {
        console.log(`[RIOT_API] Erreur récupération summonerId via match: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Récupère les informations d'un summoner par son nom (DEPRECATED - utiliser getAccountByRiotId)
   */
  async getSummonerByName(summonerName, region = "euw1") {
    try {
      const platform = REGIONS[region]?.platform || region;
      const url = `${this.baseURLs.platform(platform)}/lol/summoner/v4/summoners/by-name/${encodeURIComponent(summonerName)}`;
      
      const response = await axios.get(url, {
        headers: {
          "X-Riot-Token": this.apiKey,
        },
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("Summoner introuvable");
      }
      if (error.response?.status === 403) {
        throw new Error("Clé API Riot invalide ou expirée");
      }
      throw error;
    }
  }

  /**
   * Récupère les rangs d'un joueur via PUUID (comme dans nexus-lfg)
   */
  async getRankedStatsByPuuid(puuid, region = "euw1") {
    try {
      const platform = REGIONS[region]?.platform || region;
      const url = `${this.baseURLs.platform(platform)}/lol/league/v4/entries/by-puuid/${puuid}`;
      
      console.log(`[RIOT_API] getRankedStatsByPuuid: ${url}`);
      
      // Utiliser retryWithBackoff pour gérer les rate limits
      const response = await this.retryWithBackoff(async () => {
        return await axios.get(url, {
          headers: {
            "X-Riot-Token": this.apiKey,
          },
        });
      });

      console.log(`[RIOT_API] Rangs récupérés: ${response.data.length} entrées`);
      if (response.data.length > 0) {
        console.log(`[RIOT_API] Détails des rangs:`, JSON.stringify(response.data.map(e => ({
          queueType: e.queueType,
          tier: e.tier,
          rank: e.rank,
          wins: e.wins,
          losses: e.losses
        }))));
      }
      return response.data; // Retourne un tableau avec les rangs (Solo/Duo, Flex, etc.)
    } catch (error) {
      console.log(`[RIOT_API] Erreur getRankedStatsByPuuid:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 404) {
        console.log(`[RIOT_API] Joueur non classé (404)`);
        return []; // Pas de rang = pas encore classé
      }
      throw error;
    }
  }

  /**
   * Récupère les stats de victoires/défaites depuis les matchs récents
   */
  async getMatchHistory(puuid, region = "euw1", count = 20) {
    try {
      const regional = REGIONS[region]?.regional || "europe";
      const url = `${this.baseURLs.regional(regional)}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;
      
      return await this.retryWithBackoff(async () => {
        const response = await axios.get(url, {
          headers: {
            "X-Riot-Token": this.apiKey,
          },
        });
        return response.data; // Liste des IDs de matchs
      });
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }
      if (error.response?.status === 429) {
        throw new Error("Rate limit Riot API atteint. Veuillez réessayer dans quelques instants.");
      }
      throw error;
    }
  }

  /**
   * Compte les games ranked de la journée
   */
  async getTodayRankedGames(puuid, region = "euw1") {
    try {
      // Date de début d'aujourd'hui (minuit UTC)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayStart = today.getTime();

      // Récupérer les matchs récents (limite à 20 pour être rapide)
      const matchIds = await this.getMatchHistory(puuid, region, 20);
      
      if (matchIds.length === 0) {
        return { soloDuo: 0, flex: 0, total: 0 };
      }

      let soloDuoCount = 0;
      let flexCount = 0;

      console.log(`[RIOT_API] Analyse de ${matchIds.length} matchs récents pour compter les games d'aujourd'hui...`);
      
      // Analyser les matchs récents jusqu'à trouver un match d'hier
      for (let i = 0; i < matchIds.length; i++) {
        const matchId = matchIds[i];
        try {
          const match = await this.getMatchDetails(matchId, region);
          const matchTimestamp = match.info.gameCreation || match.info.gameStartTimestamp;
          
          // Si le match est d'avant aujourd'hui, on peut arrêter
          if (matchTimestamp < todayStart) {
            break;
          }
          
          const queueId = match.info.queueId;
          // 420 = Ranked Solo/Duo, 440 = Ranked Flex
          if (queueId === 420) {
            soloDuoCount++;
          } else if (queueId === 440) {
            flexCount++;
          }
          
          // Petit délai pour éviter rate limit
          if (i < matchIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          if (error.response?.status === 429) {
            console.log(`[RIOT_API] Rate limit lors du comptage, arrêt`);
            break;
          }
          console.log(`[WARN] Erreur match ${matchId}: ${error.message}`);
        }
      }

      return { 
        soloDuo: soloDuoCount, 
        flex: flexCount, 
        total: soloDuoCount + flexCount 
      };
    } catch (error) {
      console.log("[ERROR] Erreur lors du comptage des games de la journée:", error.message);
      return { soloDuo: 0, flex: 0, total: 0 };
    }
  }

  /**
   * Récupère les détails d'un match
   */
  async getMatchDetails(matchId, region = "euw1") {
    try {
      const regional = REGIONS[region]?.regional || "europe";
      const url = `${this.baseURLs.regional(regional)}/lol/match/v5/matches/${matchId}`;
      
      return await this.retryWithBackoff(async () => {
        const response = await axios.get(url, {
          headers: {
            "X-Riot-Token": this.apiKey,
          },
        });
        return response.data;
      });
    } catch (error) {
      if (error.response?.status === 429) {
        throw new Error("Rate limit Riot API atteint. Veuillez réessayer dans quelques instants.");
      }
      throw error;
    }
  }

  /**
   * Calcule les stats de victoires/défaites depuis les matchs récents
   * @param {string} puuid - PUUID du joueur
   * @param {string} region - Région
   * @param {number} matchCount - Nombre de matchs à analyser (max 100)
   */
  async calculateWinLossStats(puuid, region = "euw1", matchCount = 100) {
    try {
      // Récupérer jusqu'à 100 matchs (limite de l'API)
      const matchIds = await this.getMatchHistory(puuid, region, Math.min(matchCount, 100));
      
      if (matchIds.length === 0) {
        return { 
          soloDuo: { wins: 0, losses: 0, total: 0 },
          flex: { wins: 0, losses: 0, total: 0 },
          ranked: { wins: 0, losses: 0, total: 0 }
        };
      }

      let soloDuoWins = 0;
      let soloDuoLosses = 0;
      let flexWins = 0;
      let flexLosses = 0;

      // Date de début de la saison S2025 (janvier 2025)
      const season2025Start = new Date('2025-01-01T00:00:00Z').getTime();

      console.log(`[RIOT_API] Analyse de ${matchIds.length} matchs pour trouver tous les matchs Ranked de la saison S2025...`);
      
      // Analyser TOUS les matchs pour trouver tous les matchs ranked (pas de limite)
      // On s'arrête seulement si on a analysé tous les matchs ou si rate limit
      let matchesAnalyzed = 0;
      let rankedMatchesFound = 0;
      
      for (let i = 0; i < matchIds.length; i++) {
        const matchId = matchIds[i];
        try {
          const match = await this.getMatchDetails(matchId, region);
          matchesAnalyzed++;
          
          // Filtrer par saison : ne compter que les matchs de S2025
          const matchTimestamp = match.info.gameCreation || match.info.gameStartTimestamp;
          if (matchTimestamp < season2025Start) {
            // Match d'une saison précédente, on l'ignore
            continue;
          }
          
          const participant = match.info.participants.find(p => p.puuid === puuid);
          
          if (participant) {
            const queueId = match.info.queueId;
            // 420 = Ranked Solo/Duo, 440 = Ranked Flex
            // On ignore tous les autres types de matchs
            if (queueId === 420) {
              // Solo/Duo Queue
              rankedMatchesFound++;
              if (participant.win) {
                soloDuoWins++;
              } else {
                soloDuoLosses++;
              }
              console.log(`[RIOT_API] Match ${i+1}/${matchIds.length}: Solo/Duo S2025 - ${participant.win ? 'Victoire' : 'Défaite'}`);
            } else if (queueId === 440) {
              // Flex Queue
              rankedMatchesFound++;
              if (participant.win) {
                flexWins++;
              } else {
                flexLosses++;
              }
              console.log(`[RIOT_API] Match ${i+1}/${matchIds.length}: Flex S2025 - ${participant.win ? 'Victoire' : 'Défaite'}`);
            }
          }
          
          // Rate limiting: pause de 200ms entre chaque requête
          // et pause plus longue tous les 10 matchs
          if ((i + 1) % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`[RIOT_API] Progression: ${i+1}/${matchIds.length} matchs analysés, ${rankedMatchesFound} ranked trouvés`);
          } else {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          if (error.response?.status === 429) {
            console.log(`[WARN] Rate limit atteint lors de l'analyse, arrêt après ${matchesAnalyzed} matchs analysés (${rankedMatchesFound} ranked)`);
            break; // Arrêter si rate limit
          }
          console.log(`[WARN] Erreur match ${matchId}: ${error.message}`);
        }
      }
      
      console.log(`[RIOT_API] Analyse terminée: ${matchesAnalyzed} matchs analysés, ${rankedMatchesFound} ranked trouvés`);

      const totalRankedWins = soloDuoWins + flexWins;
      const totalRankedLosses = soloDuoLosses + flexLosses;
      const totalRanked = totalRankedWins + totalRankedLosses;

      console.log(`[RIOT_API] Stats calculées: Solo/Duo ${soloDuoWins}W/${soloDuoLosses}L | Flex ${flexWins}W/${flexLosses}L | Total Ranked: ${totalRankedWins}W/${totalRankedLosses}L`);

      return { 
        soloDuo: { 
          wins: soloDuoWins, 
          losses: soloDuoLosses, 
          total: soloDuoWins + soloDuoLosses 
        },
        flex: { 
          wins: flexWins, 
          losses: flexLosses, 
          total: flexWins + flexLosses 
        },
        ranked: {
          wins: totalRankedWins,
          losses: totalRankedLosses,
          total: totalRanked
        }
      };
    } catch (error) {
      console.log("[ERROR] Erreur lors du calcul des stats:", error.message);
      return { 
        soloDuo: { wins: 0, losses: 0, total: 0 },
        flex: { wins: 0, losses: 0, total: 0 },
        ranked: { wins: 0, losses: 0, total: 0 }
      };
    }
  }

  /**
   * Formate le rang pour l'affichage
   */
  formatRank(rankedEntries) {
    if (!rankedEntries || rankedEntries.length === 0) {
      return "Non classé";
    }

    // Chercher le rang Solo/Duo en priorité
    const soloDuo = rankedEntries.find(entry => entry.queueType === "RANKED_SOLO_5x5");
    if (soloDuo) {
      return `${soloDuo.tier} ${soloDuo.rank} (${soloDuo.leaguePoints} LP)`;
    }

    // Sinon prendre le premier rang disponible
    const firstRank = rankedEntries[0];
    return `${firstRank.tier} ${firstRank.rank} (${firstRank.leaguePoints} LP)`;
  }
}

module.exports = RiotAPI;
