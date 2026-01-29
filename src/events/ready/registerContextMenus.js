require("colors");

const { testServerId } = require("../../config.json");
const getApplicationContextMenus = require("../../utils/getApplicationCommands");
const getLocalContextMenus = require("../../utils/getLocalContextMenus");

module.exports = async (client) => {
  try {
    const localContextMenus = getLocalContextMenus();
    const applicationContextMenus = await getApplicationContextMenus(
      client,
      testServerId
    );

    for (const localContextMenu of localContextMenus) {
      const { data } = localContextMenu;

      const contextMenuName = data.name;
      const contextMenuType = data.type;

      const existingContextMenu = await applicationContextMenus.cache.find(
        (cmd) => cmd.name === contextMenuName
      );

      if (existingContextMenu) {
        if (localContextMenu.deleted) {
          await applicationContextMenus.delete(existingContextMenu.id);
          console.log(
            `Commande d'application ${contextMenuName} a été supprimée.`.red
          );
          continue;
        }
      } else {
        if (localContextMenu.deleted) {
          console.log(
            `Commande d'application ${contextMenuName} a été ignoré, puisque la propriété "deleted" est fixée à "true".`
              .grey
          );
          continue;
        }

        await applicationContextMenus.create({
          name: contextMenuName,
          type: contextMenuType,
        });
        console.log(
          `Commande d'application ${contextMenuName} a été enregistré.`.green
        );
      }
    }
  } catch (err) {
    console.log(
      `Une erreur s'est produite lors de l'enregistrement des menus contextuels ! ${err}`
        .red
    );
  }
};
