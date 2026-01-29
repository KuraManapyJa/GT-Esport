const path = require("path");
const getAllFiles = require("./getAllFiles");

module.exports = (exceptions = []) => {
    let buttons = [];
    const buttonCategories = getAllFiles(
        path.join(__dirname, "..", "buttons"),
        true
    );

    for (const buttonCategory of buttonCategories) {
        const buttonFiles = getAllFiles(buttonCategory);

        for (const buttonFile of buttonFiles) {
            const buttonObject = require(buttonFile);

            if (!buttonObject.customId) {
                console.warn(`❌ Le fichier ${buttonFile} n'a pas de customId défini.`);
                continue;
            }

            if (exceptions.includes(buttonObject.customId)) continue;
            
            buttons.push(buttonObject);
        }
    }

    return buttons;
};
