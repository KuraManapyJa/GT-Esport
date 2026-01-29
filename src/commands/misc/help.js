require("colors");

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const path = require("path");
const getAllFiles = require("../../utils/getAllFiles");
const buttonPagination = require("../../utils/buttonPagination");
const mConfig = require("../../messageConfig.json");
const config = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription(
      "Affiche la liste de toutes les commandes disponibles avec leurs descriptions.",
    )
    .toJSON(),
  testMode: false,
  devOnly: false,
  deleted: false,
  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      const isDeveloper = config.developersId.includes(interaction.user.id);

      // Utiliser le même système que getLocalCommands pour organiser par catégorie
      const commandsByCategory = {};
      const commandCategories = getAllFiles(path.join(__dirname, ".."), true);

      // Parcourir chaque catégorie (même logique que getLocalCommands)
      for (const commandCategory of commandCategories) {
        const categoryName = path.basename(commandCategory);
        const commandFiles = getAllFiles(commandCategory);

        for (const commandFile of commandFiles) {
          const commandObject = require(commandFile);

          // Ignorer les commandes supprimées
          if (commandObject.deleted) continue;

          // Ignorer les commandes devOnly si l'utilisateur n'est pas développeur
          if (commandObject.devOnly && !isDeveloper) continue;

          if (!commandsByCategory[categoryName]) {
            commandsByCategory[categoryName] = [];
          }

          commandsByCategory[categoryName].push(commandObject);
        }
      }

      // Mapping des noms de catégories pour un affichage plus convivial
      const categoryNames = {
        admin: "👑 Administrateur",
        moderator: "🛡️ Modérateur",
        member: "👤 Membre",
        misc: "📋 Divers",
        developers: "⚙️ Développeur",
        tests: "🧪 Tests",
      };

      // Créer les embeds pour chaque catégorie
      const pages = [];
      const categories = Object.keys(commandsByCategory).sort();

      // Trier les catégories dans un ordre logique
      const categoryOrder = [
        "member",
        "moderator",
        "admin",
        "misc",
        "developers",
        "tests",
      ];
      const sortedCategories = categories.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      // Compter le total de commandes
      let totalCommands = 0;
      Object.values(commandsByCategory).forEach((categoryCommands) => {
        totalCommands += categoryCommands.length;
      });

      // Page d'accueil
      const homeEmbed = new EmbedBuilder()
        .setTitle("📚 Menu d'aide")
        .setDescription(
          `Bienvenue dans le menu d'aide ! Utilisez les boutons ci-dessous pour naviguer entre les catégories de commandes.\n\n**Total de commandes:** ${totalCommands}\n**Catégories disponibles:** ${sortedCategories.length}`,
        )
        .setColor(`#${mConfig.embedColorIncolor}`)
        .setFooter({
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
          text: `${client.user.username} | Menu d'aide`,
        })
        .setTimestamp();

      // Ajouter les catégories à la page d'accueil
      sortedCategories.forEach((category, index) => {
        const categoryName =
          categoryNames[category] ||
          category.charAt(0).toUpperCase() + category.slice(1);
        const commandCount = commandsByCategory[category].length;
        homeEmbed.addFields({
          name: `${index + 1}. ${categoryName}`,
          value: `${commandCount} commande${commandCount > 1 ? "s" : ""}`,
          inline: true,
        });
      });

      pages.push(homeEmbed);

      // Créer une page pour chaque catégorie
      sortedCategories.forEach((category) => {
        const categoryCommands = commandsByCategory[category];
        const categoryName =
          categoryNames[category] ||
          category.charAt(0).toUpperCase() + category.slice(1);

        // Diviser les commandes en pages si nécessaire (max 10 commandes par page)
        const commandsPerPage = 10;
        const totalPages = Math.ceil(categoryCommands.length / commandsPerPage);

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
          const startIndex = pageIndex * commandsPerPage;
          const endIndex = Math.min(
            startIndex + commandsPerPage,
            categoryCommands.length,
          );
          const pageCommands = categoryCommands.slice(startIndex, endIndex);

          const categoryEmbed = new EmbedBuilder()
            .setTitle(`📁 ${categoryName} - Commandes`)
            .setDescription(
              `Liste des commandes de la catégorie **${categoryName}**\n\n`,
            )
            .setColor(`#${mConfig.embedColorIncolor}`)
            .setFooter({
              iconURL: client.user.displayAvatarURL({ dynamic: true }),
              text: `${client.user.username} | Page ${pageIndex + 1}/${totalPages} | ${categoryCommands.length} commande${categoryCommands.length > 1 ? "s" : ""}`,
            })
            .setTimestamp();

          pageCommands.forEach((command) => {
            const commandName = `\`/${command.data.name}\``;
            const commandDescription =
              command.data.description || "Aucune description";
            const isDevOnly = command.devOnly ? " 🔒" : "";

            categoryEmbed.addFields({
              name: `${commandName}${isDevOnly}`,
              value: commandDescription,
              inline: false,
            });
          });

          pages.push(categoryEmbed);
        }
      });

      // Utiliser le système de pagination
      await buttonPagination(interaction, pages, 60 * 1000);
    } catch (err) {
      console.log("[ERROR]".red + "Error in help.js run function:");
      console.log(err);
      return interaction.reply({
        content: mConfig.embedErrorMessage,
        ephemeral: true,
      });
    }
  },
};
