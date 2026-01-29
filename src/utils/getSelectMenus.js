const path = require("path");
const getAllFiles = require("./getAllFiles");

module.exports = (exceptions = []) => {
  let selects = [];
  const selectCategories = getAllFiles(
    path.join(__dirname, "..", "selectmenus"),
    true
  );

  for (const selectCategory of selectCategories) {
    const selectFiles = getAllFiles(selectCategory);

    for (const selectFile of selectFiles) {
      const selectObject = require(selectFile);

      if (!selectObject.customId) {
        console.warn(`❌ Le fichier ${selectFile} n'a pas de customId défini.`);
        continue;
      }

      if (exceptions.includes(selectObject.customId)) continue;
      selects.push(selectObject);
    }
  }

  return selects;
};
