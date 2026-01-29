require("colors");

const commandComparing = require("../../utils/commandComparing");
const getApplicationCommands = require("../../utils/getApplicationCommands");
const getLocalCommands = require("../../utils/getLocalCommands");
const { testServerId } = require("../../config.json");

module.exports = async (client) => {
  try {
    const localCommands = getLocalCommands();
    const applicationCommands = await getApplicationCommands(
      client,
      testServerId
    );

    for (const localCommand of localCommands) {
      const { data } = localCommand;

      const commandName = data.name;
      const commandDescription = data.description;
      const commandOptions = data.options;

      // Normaliser les permissions par défaut pour éviter les BigInt dans le JSON
      let defaultMemberPermissions = undefined;
      if (data.default_member_permissions !== undefined) {
        // Si c'est un BigInt, un nombre ou déjà une chaîne, toString() renverra une chaîne sérialisable
        defaultMemberPermissions = data.default_member_permissions.toString();
      }

      const existingCommand = await applicationCommands.cache.find(
        (cmd) => cmd.name === commandName
      );

      if (existingCommand) {
        if (localCommand.deleted) {
          await applicationCommands.delete(existingCommand.id);
          console.log(
            `Commande d'application ${commandName} a été supprimée.`.red
          );
          continue;
        }

        if (commandComparing(existingCommand, localCommand)) {
          const editedCommandData = {
            name: commandName,
            description: commandDescription,
            options: commandOptions,
          };

          if (defaultMemberPermissions !== undefined) {
            editedCommandData.defaultMemberPermissions = defaultMemberPermissions;
          }

          await applicationCommands.edit(existingCommand.id, editedCommandData);
          console.log(
            `Commande d'application ${commandName} a été édité.`.yellow
          );
        }
      } else {
        if (localCommand.deleted) {
          console.log(
            `Commande d'application ${commandName} a été ignoré, puisque la propriété "deleted" est fixée à "true".`
              .grey
          );
          continue;
        }

        const newCommandData = {
          name: commandName,
          description: commandDescription,
          options: commandOptions,
        };

        if (defaultMemberPermissions !== undefined) {
          newCommandData.defaultMemberPermissions = defaultMemberPermissions;
        }

        await applicationCommands.create(newCommandData);

        console.log(
          `Commande d'application ${commandName} a été enregistré.`.green
        );
      }
    }
  } catch (err) {
    console.log(
      `Une erreur s'est produite lors de l'enregistrement des commandes ! ${err}`
        .red
    );
  }
};
