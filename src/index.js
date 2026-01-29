require("dotenv/config");

const { Client, GatewayIntentBits } = require("discord.js");
const eventHandler = require("./handlers/eventHandler");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites
  ],
});

eventHandler(client);

client.login(process.env.TOKEN);

process.on("unhandledRejection", (reason, p) => {
  console.log(" [Anticrash] :: Unhandled Rejection/Catch");
  console.log(reason, p);
});

process.on("uncaughtException", (err, origin) => {
  console.log(" [Anticrash] :: Uncaught Exception/Catch");
  console.log(err, origin);
});

process.on("uncaughtExceptionMonitor", (err, origin) => {
  console.log(" [Anticrash] :: Uncaught Exception/Catch (MONITOR)");
  console.log(err, origin);
});
