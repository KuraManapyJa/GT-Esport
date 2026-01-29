require("colors");
const mongoose = require("mongoose");
const mongoURI = process.env.MONGO_URL;

module.exports = async (client) => {
  console.log(`${client.user.username} est maintenant en ligne.`.blue);
  if (!mongoURI) return;
  mongoose.set("strictQuery", true);

  if (await mongoose.connect(mongoURI)) {
    console.log(`Connexion à la base de données MongoDB.`.green);
  }
};
