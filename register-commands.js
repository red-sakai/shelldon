require('dotenv').config();

const { REST, Routes } = require('discord.js');

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID; // Your application (bot) client ID
const guildId = process.env.GUILD_ID; // Target guild to register the command

if (!token || !clientId || !guildId) {
  console.error(
    'Missing TOKEN, CLIENT_ID, or GUILD_ID in environment. Create a .env file (see .env.example).'
  );
  process.exit(1);
}

// Define commands using raw JSON to avoid extra builder dependency
const commands = [
  {
    name: 'announce',
    description: 'Send an announcement to a channel',
    type: 1, // CHAT_INPUT
    options: [
      {
        name: 'message',
        description: 'The announcement text',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'channel',
        description: 'Channel to post the announcement in',
        type: 7, // CHANNEL
        required: true,
        channel_types: [0, 5], // GUILD_TEXT, GUILD_ANNOUNCEMENT
      },
    ],
    dm_permission: false,
    default_member_permissions: null, // permission checks are done at runtime
  },
];

(async () => {
  try {
    const rest = new REST({ version: '10' }).setToken(token);

    console.log('Registering application (guild) commands...');

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });

    console.log('Successfully registered commands for guild', guildId);
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
})();
