const path = require("path");
const getAllFiles = require("./getAllFiles");

module.exports = (exceptions = []) => {
  let modals = [];

  // Parcourir récursivement les dossiers de modals (comme getLocalCommands)
  const modalCategories = getAllFiles(
    path.join(__dirname, "..", "modals"),
    true,
  );

  // Si pas de sous-dossiers, chercher directement dans modals
  if (modalCategories.length === 0) {
    const modalFiles = getAllFiles(path.join(__dirname, "..", "modals"));

    for (const modalFile of modalFiles) {
      try {
        const modalObject = require(modalFile);

        if (exceptions.includes(modalObject.name)) continue;
        if (!modalObject || !modalObject.customId || !modalObject.run) continue;

        modals.push(modalObject);
      } catch (error) {
        console.log(
          "[ERROR] Erreur lors du chargement du modal:".red,
          modalFile,
        );
        console.log("[ERROR]".red, error);
      }
    }
  } else {
    // Parcourir chaque catégorie
    for (const modalCategory of modalCategories) {
      const modalFiles = getAllFiles(modalCategory);

      for (const modalFile of modalFiles) {
        try {
          const modalObject = require(modalFile);

          if (exceptions.includes(modalObject.name)) continue;
          if (!modalObject || !modalObject.customId || !modalObject.run)
            continue;

          modals.push(modalObject);
        } catch (error) {
          console.log(
            "[ERROR] Erreur lors du chargement du modal:".red,
            modalFile,
          );
          console.log("[ERROR]".red, error);
        }
      }
    }
  }

  return modals;
};
