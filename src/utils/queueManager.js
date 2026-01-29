const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionOverwrite,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const { rate, Rating } = require("ts-trueskill");
const { v4: uuidv4 } = require("uuid");
const QueueConfig = require("../schemas/queueConfigSchema");
const Game = require("../schemas/gameSchema");
const GameMember = require("../schemas/gameMemberSchema");
const MMRRating = require("../schemas/mmrRatingSchema");
const Points = require("../schemas/pointsSchema");
const mConfig = require("../messageConfig.json");

// Rôles par jeu
const GAME_ROLES = {
  lol: ["top", "jungle", "mid", "adc", "support"],
  valorant: ["controller", "initiator", "sentinel", "duelist", "flex"],
  other: ["role 1", "role 2", "role 3", "role 4", "role 5"],
};

// Emojis pour les rôles (à personnaliser selon vos besoins)
const ROLE_EMOJIS = {
  top: "🔱",
  jungle: "🌿",
  mid: "⚔️",
  adc: "🏹",
  support: "🛡️",
  controller: "🎯",
  initiator: "💥",
  sentinel: "🛡️",
  duelist: "⚔️",
  flex: "❓",
  tank: "🛡️",
  "dps 1": "💥",
  "dps 2": "💥",
  "support 1": "💚",
  "support 2": "💚",
  "role 1": "1️⃣",
  "role 2": "2️⃣",
  "role 3": "3️⃣",
  "role 4": "4️⃣",
  "role 5": "5️⃣",
};

// Titres par jeu
const GAME_TITLES = {
  lol: "Vue d'ensemble du match - Draft de tournoi SR",
  valorant: "Vue d'ensemble du match - Compétitif Valorant",
  other: "Vue d'ensemble du match",
};

/**
 * Génère un embed pour la queue (style InHouseQueue)
 */
async function generateQueueEmbed(bot, gameId, game, guildId, gameMode = "casual", mmrEnabled = true) {
  const gameMembers = await GameMember.find({ gameId });
  const gameData = await Game.findOne({ gameId });
  const QueueConfig = require("../schemas/queueConfigSchema");
  const config = await QueueConfig.findOne({ guildId, game });
  
  const gameNames = {
    lol: "League Of Legends",
    valorant: "Valorant",
    other: "Jeu personnalisé",
  };

  const embed = new EmbedBuilder()
    .setTitle(`${config?.guildName || "GT Esport"} - ${gameNames[game]}`)
    .setColor(`#${mConfig.embedColorIncolor}`);

  // Ajouter MMR status et Game Mode
  const mmrStatus = mmrEnabled ? "🟢 ON" : "🔴 OFF";
  const modeNames = {
    ranked: "Mode Classé",
    rosters: "Mode Rosters",
    captain: "Mode Capitaine",
    casual: "Mode Décontracté",
  };
  const modeStatus = gameMode === "ranked" ? "🟢" : gameMode === "casual" ? "🔴" : "🟡";
  
  embed.setDescription(
    `**MMR:** ${mmrStatus} | **${modeNames[gameMode]}:** ${modeStatus}`
  );

  // Afficher les slots selon le mode
  if (gameMode === "casual" || gameMode === "ranked") {
    // Mode Casual/Ranked : Slot 1 et Slot 2
    const slot1 = [];
    const slot2 = [];

    for (const member of gameMembers) {
      if (member.team === "blue") {
        slot1.push(member);
      } else {
        slot2.push(member);
      }
    }

    let slot1Value = "";
    let slot2Value = "";

    for (const member of slot1) {
      slot1Value += `<@${member.userId}>\n`;
    }
    if (!slot1Value) slot1Value = "Aucun membre pour le moment";

    for (const member of slot2) {
      slot2Value += `<@${member.userId}>\n`;
    }
    if (!slot2Value) slot2Value = "Aucun membre pour le moment";

    embed.addFields(
      { name: "Slot 1", value: slot1Value, inline: true },
      { name: "Slot 2", value: slot2Value, inline: true }
    );
  } else {
    // Mode Rosters : Blue et Red
    const blueTeam = [];
    const redTeam = [];

    for (const member of gameMembers) {
      if (member.team === "blue") {
        blueTeam.push(member);
      } else {
        redTeam.push(member);
      }
    }

    let blueValue = "";
    let redValue = "";

    for (const member of blueTeam) {
      const emoji = ROLE_EMOJIS[member.role] || "👤";
      blueValue += `${emoji} <@${member.userId}> - \`${member.role?.toUpperCase() || "FILL"}\`\n`;
    }
    if (!blueValue) blueValue = "Aucun membre pour le moment";

    for (const member of redTeam) {
      const emoji = ROLE_EMOJIS[member.role] || "👤";
      redValue += `${emoji} <@${member.userId}> - \`${member.role?.toUpperCase() || "FILL"}\`\n`;
    }
    if (!redValue) redValue = "Aucun membre pour le moment";

    embed.addFields(
      { name: "🔵 Blue", value: blueValue, inline: true },
      { name: "🔴 Red", value: redValue, inline: true }
    );
  }

  // Ajouter l'image banner
  const bannerUrls = {
    lol: "https://cdn.discordapp.com/attachments/328696263568654337/1068133100451803197/image.png",
    valorant: "https://media.discordapp.net/attachments/1046664511324692520/1077958380964036689/image.png",
  };
  if (bannerUrls[game]) {
    embed.setImage(bannerUrls[game]);
  }

  // Footer avec Game ID
  embed.setFooter({
    text: `🎮 ${gameId.substring(0, 8)} | ${gameMembers.length}/10 joueurs`,
  });

  return embed;
}

/**
 * Crée les boutons pour rejoindre la queue (style InHouseQueue)
 */
function createQueueButtons(game, gameId, gameMode = "casual") {
  const rows = [];

  if (gameMode === "casual" || gameMode === "ranked") {
    // Mode Casual/Ranked : Juste Join Queue et Leave Queue
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`queue_join_${gameId}`)
        .setLabel("Rejoindre la queue")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`queue_leave_${gameId}`)
        .setLabel("Quitter la queue")
        .setStyle(ButtonStyle.Danger)
    );
    rows.push(actionRow);
  } else {
    // Mode Rosters : Boutons de rôles + Join/Leave
    const roles = GAME_ROLES[game] || GAME_ROLES.other;
    const buttonsPerRow = 5;

    for (let i = 0; i < roles.length; i += buttonsPerRow) {
      const row = new ActionRowBuilder();
      const rowRoles = roles.slice(i, i + buttonsPerRow);

      for (const role of rowRoles) {
        const emoji = ROLE_EMOJIS[role] || "👤";
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`queue_join_${gameId}_${role}`)
            .setLabel(role.toUpperCase())
            .setEmoji(emoji)
            .setStyle(ButtonStyle.Primary)
        );
      }
      rows.push(row);
    }

    // Boutons d'action
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`queue_leave_${gameId}`)
        .setLabel("Quitter la queue")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`queue_switch_${gameId}`)
        .setLabel("Changer d'équipe")
        .setStyle(ButtonStyle.Secondary)
    );
    rows.push(actionRow);
  }

  return rows;
}

/**
 * Démarre une nouvelle queue
 */
async function startQueue(bot, channel, author = null, gameModeOverride = null, mmrEnabledOverride = null) {
  try {
    const QueueConfig = require("../schemas/queueConfigSchema");
    
    // Vérifier si le canal est configuré
    const queueConfig = await QueueConfig.findOne({
      queueChannelId: channel.id,
    });

    if (!queueConfig) {
      return {
        error: "Ce canal n'est pas configuré comme canal de queue. Utilisez `/setup_inhouse` pour le configurer.",
      };
    }

    // Vérifier s'il y a déjà une queue active dans ce canal
    const activeGame = await Game.findOne({
      queueChannelId: channel.id,
      status: { $in: ["queue", "ready", "in_progress"] },
    });

    if (activeGame) {
      return {
        error: "Une queue est déjà active dans ce canal.",
      };
    }

    // Utiliser les paramètres fournis ou ceux de la config par défaut
    const gameMode = gameModeOverride || queueConfig.gameMode || "casual";
    const mmrEnabled = mmrEnabledOverride !== null ? mmrEnabledOverride : (queueConfig.mmrEnabled ?? true);

    // Créer un nouveau jeu
    const gameId = uuidv4();
    const game = await Game.create({
      gameId,
      guildId: channel.guild.id,
      queueChannelId: channel.id,
      game: queueConfig.game,
      status: "queue",
      gameMode: gameMode, // Stocker le mode pour cette queue spécifique
      mmrEnabled: mmrEnabled, // Stocker le MMR pour cette queue spécifique
    });

    // Générer l'embed et les boutons avec le game mode
    const embed = await generateQueueEmbed(
      bot,
      gameId,
      queueConfig.game,
      channel.guild.id,
      gameMode,
      mmrEnabled
    );
    const components = createQueueButtons(
      queueConfig.game,
      gameId,
      gameMode
    );

    // Envoyer le message de queue
    const queueMessage = await channel.send({
      embeds: [embed],
      components,
    });

    // Mettre à jour le jeu avec l'ID du message
    game.queueMessageId = queueMessage.id;
    await game.save();

    return { success: true, gameId, game };
  } catch (error) {
    console.error("Erreur lors du démarrage de la queue:", error);
    return { error: "Une erreur s'est produite lors du démarrage de la queue." };
  }
}

/**
 * Ajoute un joueur à la queue (mode Casual sans rôle, ou mode Ranked/Rosters avec rôle)
 */
async function addPlayerToQueue(bot, interaction, gameId, role = null) {
  try {
    const game = await Game.findOne({ gameId });
    if (!game) {
      return { error: "Cette queue n'existe plus." };
    }

    if (game.status !== "queue") {
      return { error: "Cette queue n'accepte plus de nouveaux joueurs." };
    }

    // Vérifier si le joueur est déjà dans la queue
    const existingMember = await GameMember.findOne({
      gameId,
      userId: interaction.user.id,
    });

    if (existingMember) {
      return { error: "Vous êtes déjà dans cette queue." };
    }

    // Pour League of Legends : vérifier que le joueur a un compte LoL lié
    if (game.game === "lol") {
      const LolAccount = require("../schemas/lolAccountSchema");
      const lolAccount = await LolAccount.findOne({ userId: interaction.user.id });
      if (!lolAccount) {
        return {
          error: "Vous devez lier un compte League of Legends pour participer à cette queue. Utilisez `/lol_link` ou le message d'inscription du salon configuré avec `/lol_setup`.",
        };
      }
    }

    // Utiliser le gameMode et mmrEnabled stockés dans le Game, sinon ceux de la config
    let gameMode = game.gameMode || "casual";
    let mmrEnabled = game.mmrEnabled !== undefined ? game.mmrEnabled : true;
    
    // Si pas stocké dans le Game, récupérer de la config
    if (!game.gameMode || game.mmrEnabled === undefined) {
      const QueueConfig = require("../schemas/queueConfigSchema");
      const config = await QueueConfig.findOne({
        guildId: game.guildId,
        game: game.game,
      });
      
      if (config) {
        gameMode = game.gameMode || config.gameMode || "casual";
        mmrEnabled = game.mmrEnabled !== undefined ? game.mmrEnabled : (config.mmrEnabled ?? true);
      }
    }

    // En mode Casual/Ranked, pas de rôle - assigner automatiquement à une équipe
    if (gameMode === "casual" || gameMode === "ranked") {
      // Assigner alternativement aux équipes pour équilibrer
      const allMembers = await GameMember.find({ gameId });
      const blueCount = allMembers.filter((m) => m.team === "blue").length;
      const redCount = allMembers.filter((m) => m.team === "red").length;
      
      const team = blueCount <= redCount ? "blue" : "red";

      await GameMember.create({
        userId: interaction.user.id,
        gameId,
        role: "fill", // Pas de rôle spécifique en mode Casual
        team,
        queueMessageId: game.queueMessageId,
        channelId: game.queueChannelId,
      });
    } else {
      // Mode Rosters : nécessite un rôle
      if (!role) {
        return { error: "Vous devez sélectionner un rôle en mode Rosters." };
      }

      // Vérifier si le rôle est déjà pris (2 joueurs max par rôle)
      const roleMembers = await GameMember.find({ gameId, role });
      if (roleMembers.length >= 2) {
        return { error: "Ce rôle est déjà pris par 2 joueurs." };
      }

      // Déterminer l'équipe (blue si le rôle n'a pas de membre, red si un membre est déjà en blue)
      let team = "blue";
      if (roleMembers.length > 0) {
        team = roleMembers[0].team === "blue" ? "red" : "blue";
      }

      await GameMember.create({
        userId: interaction.user.id,
        gameId,
        role,
        team,
        queueMessageId: game.queueMessageId,
        channelId: game.queueChannelId,
      });
    }

    // Vérifier si on a 10 joueurs
    const allMembers = await GameMember.find({ gameId });
    if (allMembers.length >= 10) {
      // Lancer le matchmaking
      await startMatchmaking(bot, gameId);
    } else {
      // Mettre à jour l'embed
      const embed = await generateQueueEmbed(
        bot,
        gameId,
        game.game,
        game.guildId,
        gameMode,
        mmrEnabled
      );
      const components = createQueueButtons(game.game, gameId, gameMode);

      const channel = bot.channels.cache.get(game.queueChannelId);
      const message = await channel.messages.fetch(game.queueMessageId);
      await message.edit({ embeds: [embed], components });
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de l'ajout du joueur:", error);
    return { error: "Une erreur s'est produite." };
  }
}

/**
 * Retire un joueur de la queue
 */
async function removePlayerFromQueue(bot, interaction, gameId) {
  try {
    const game = await Game.findOne({ gameId });
    if (!game) {
      return { error: "Cette queue n'existe plus." };
    }

    if (game.status !== "queue") {
      return { error: "Vous ne pouvez pas quitter une queue qui a déjà commencé." };
    }

    const member = await GameMember.findOneAndDelete({
      gameId,
      userId: interaction.user.id,
    });

    if (!member) {
      return { error: "Vous n'êtes pas dans cette queue." };
    }

    // Mettre à jour l'embed
    const queueConfig = await QueueConfig.findOne({
      queueChannelId: game.queueChannelId,
    });
    const embed = await generateQueueEmbed(
      bot,
      gameId,
      queueConfig.game,
      game.guildId,
      queueConfig.gameMode || "casual",
      queueConfig.mmrEnabled ?? true
    );
      const components = createQueueButtons(
        queueConfig.game,
        gameId,
        gameModeForEmbed
      );

    const channel = bot.channels.cache.get(game.queueChannelId);
    const message = await channel.messages.fetch(game.queueMessageId);
    await message.edit({ embeds: [embed], components });

    return { success: true };
  } catch (error) {
    console.error("Erreur lors du retrait du joueur:", error);
    return { error: "Une erreur s'est produite." };
  }
}

/**
 * Démarre le matchmaking et crée les équipes
 */
async function startMatchmaking(bot, gameId) {
  try {
    const game = await Game.findOne({ gameId });
    if (!game) return;

    const members = await GameMember.find({ gameId });
    if (members.length < 10) return;

    // Vérifier si le MMR est activé pour ce match
    const mmrEnabled = game.mmrEnabled !== undefined ? game.mmrEnabled : true;
    
    // Récupérer les MMR de tous les joueurs (seulement si MMR activé)
    const playersWithMMR = [];
    for (const member of members) {
      if (mmrEnabled) {
        let mmr = await MMRRating.findOne({
          userId: member.userId,
          guildId: game.guildId,
          game: game.game,
        });

        if (!mmr) {
          // Créer un MMR par défaut
          mmr = await MMRRating.create({
            userId: member.userId,
            guildId: game.guildId,
            game: game.game,
            mu: 25.0,
            sigma: 8.333,
          });
        }

        playersWithMMR.push({
          member,
          rating: new Rating(mmr.mu, mmr.sigma),
        });
      } else {
        // Si MMR désactivé, juste ajouter le membre sans rating
        playersWithMMR.push({
          member,
          rating: new Rating(25.0, 8.333), // Rating par défaut pour équilibrage aléatoire
        });
      }
    }

    // Utiliser TrueSkill pour équilibrer les équipes (ou aléatoire si MMR désactivé)
    if (mmrEnabled) {
      // Trier par MMR
      playersWithMMR.sort(
        (a, b) =>
          b.rating.mu - 2 * b.rating.sigma - (a.rating.mu - 2 * a.rating.sigma)
      );
    } else {
      // Mélanger aléatoirement si MMR désactivé
      for (let i = playersWithMMR.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playersWithMMR[i], playersWithMMR[j]] = [playersWithMMR[j], playersWithMMR[i]];
      }
    }

    // Réassigner les équipes de manière équilibrée
    for (let i = 0; i < playersWithMMR.length; i++) {
      const team = i % 2 === 0 ? "blue" : "red";
      await GameMember.updateOne(
        { gameId, userId: playersWithMMR[i].member.userId },
        { team }
      );
    }

    // Mettre à jour le statut
    game.status = "ready";
    await game.save();

    // Créer les salons et rôles
    await createGameChannels(bot, game);

    // Mettre à jour le message avec le système de ready up
    await updateReadyUpMessage(bot, gameId);

    return { success: true };
  } catch (error) {
    console.error("Erreur lors du matchmaking:", error);
    return { error: "Une erreur s'est produite lors du matchmaking." };
  }
}

/**
 * Crée les salons vocaux, textuels et rôles pour le match
 */
async function createGameChannels(bot, game) {
  try {
    const guild = bot.guilds.cache.get(game.guildId);
    if (!guild) return;

    // Créer une catégorie pour le match
    // Tout le monde peut voir la catégorie mais pas parler dans les salons (sauf discussion)
    const category = await guild.channels.create({
      name: `🎯┆Match: ${game.gameId.substring(0, 8)}`,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.id,
          allow: [PermissionFlagsBits.ViewChannel],
          deny: [PermissionFlagsBits.SendMessages],
        },
      ],
    });

    // Créer les rôles
    const blueRole = await guild.roles.create({
      name: `🔵 Équipe Bleue - ${game.gameId.substring(0, 8)}`,
      color: 0x3498db,
    });

    const redRole = await guild.roles.create({
      name: `🔴 Équipe Rouge - ${game.gameId.substring(0, 8)}`,
      color: 0xe74c3c,
    });

    // Créer le salon lobby (visible par tous mais seul les équipes peuvent parler)
    const lobbyChannel = await guild.channels.create({
      name: `💬┆lobby-${game.gameId.substring(0, 8)}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          allow: [PermissionFlagsBits.ViewChannel],
          deny: [PermissionFlagsBits.SendMessages],
        },
        {
          id: blueRole.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
        {
          id: redRole.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ],
    });

    // Créer le salon discussion (tout le monde peut voir ET parler)
    const discussionChannel = await guild.channels.create({
      name: `💬┆discussion`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ],
    });

    // Créer les salons vocaux (visibles par tous mais seul les équipes peuvent se connecter)
    const blueVoice = await guild.channels.create({
      name: `🔵┆Équipe Bleue`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          allow: [PermissionFlagsBits.ViewChannel],
          deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
        },
        {
          id: blueRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
          ],
        },
      ],
    });

    const redVoice = await guild.channels.create({
      name: `🔴┆Équipe Rouge`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          allow: [PermissionFlagsBits.ViewChannel],
          deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
        },
        {
          id: redRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
          ],
        },
      ],
    });

    // Assigner les rôles aux membres
    const members = await GameMember.find({ gameId: game.gameId });
    for (const member of members) {
      const discordMember = await guild.members.fetch(member.userId).catch(() => null);
      if (discordMember) {
        if (member.team === "blue") {
          await discordMember.roles.add(blueRole);
        } else {
          await discordMember.roles.add(redRole);
        }
      }
    }

    // Mettre à jour le jeu
    game.lobbyChannelId = lobbyChannel.id;
    game.discussionChannelId = discussionChannel.id;
    game.blueVoiceChannelId = blueVoice.id;
    game.redVoiceChannelId = redVoice.id;
    game.blueRoleId = blueRole.id;
    game.redRoleId = redRole.id;
    await game.save();

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la création des salons:", error);
    return { error: "Une erreur s'est produite." };
  }
}

/**
 * Met à jour le message avec le système de ready up
 */
async function updateReadyUpMessage(bot, gameId) {
  try {
    const game = await Game.findOne({ gameId });
    if (!game) return;

    const members = await GameMember.find({ gameId });
    const queueConfig = await QueueChannel.findOne({
      channelId: game.queueChannelId,
    });

    const embed = new EmbedBuilder()
      .setTitle(GAME_TITLES[game.game] || GAME_TITLES.other)
      .setDescription("🎮 Match trouvé ! Préparez-vous !")
      .setColor(`#${mConfig.embedColorSuccess}`);

    let blueValue = "";
    let redValue = "";

    for (const member of members) {
      const emoji = ROLE_EMOJIS[member.role] || "👤";
      const readyEmoji = member.ready ? "✅" : "❌";
      const line = `${readyEmoji} ${emoji} <@${member.userId}> - \`${member.role.toUpperCase()}\`\n`;

      if (member.team === "blue") {
        blueValue += line;
      } else {
        redValue += line;
      }
    }

    embed.addFields(
      { name: "🔵 Équipe Bleue", value: blueValue || "Aucun membre", inline: true },
      { name: "🔴 Équipe Rouge", value: redValue || "Aucun membre", inline: true }
    );

      const readyRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`queue_ready_${gameId}`)
          .setLabel("Prêt !")
          .setStyle(ButtonStyle.Success)
      );

    const channel = bot.channels.cache.get(game.queueChannelId);
    const message = await channel.messages.fetch(game.queueMessageId);
    await message.edit({ embeds: [embed], components: [readyRow] });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du message ready:", error);
  }
}

module.exports = {
  startQueue,
  addPlayerToQueue,
  removePlayerFromQueue,
  generateQueueEmbed,
  createQueueButtons,
  startMatchmaking,
  createGameChannels,
  updateReadyUpMessage,
  GAME_ROLES,
  ROLE_EMOJIS,
  GAME_TITLES,
};
