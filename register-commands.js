require('dotenv').config();

const { REST, Routes } = require('discord.js');

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID; // Your application (bot) client ID
const guildId = process.env.GUILD_ID; // Single target guild (back-compat)
const guildIdsRaw = process.env.GUILD_IDS; // Comma/space separated list of guild IDs

if (!token || !clientId) {
  console.error(
    'Missing TOKEN or CLIENT_ID in environment. Create a .env file (see .env.example).'
  );
  process.exit(1);
}

function parseIdList(str) {
  return str
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Determine which guilds to register commands in
let guildIds = [];
if (guildIdsRaw && guildIdsRaw.trim()) {
  guildIds = parseIdList(guildIdsRaw);
} else if (guildId && guildId.trim()) {
  guildIds = [guildId.trim()];
}

if (guildIds.length === 0) {
  console.error(
    'No guild(s) provided. Set GUILD_ID for a single guild or GUILD_IDS for multiple (comma or space separated).'
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
        name: 'channel',
        description: 'Channel to post the announcement in',
        type: 7, // CHANNEL
        required: true,
        channel_types: [0, 5], // GUILD_TEXT, GUILD_ANNOUNCEMENT
      },
      {
        name: 'message',
        description: 'The announcement text (optional; a modal will open if omitted)',
        type: 3, // STRING
        required: false,
      },
      {
        name: 'mention',
        description: 'Also mention/link a channel inside the message',
        type: 7, // CHANNEL
        required: false,
        channel_types: [0, 5],
      },
      {
        name: 'ping_everyone',
        description: 'Allow this announcement to @everyone (requires permissions)',
        type: 5, // BOOLEAN
        required: false,
      },
      {
        name: 'role',
        description: 'Role to mention in the message (use {role} token)',
        type: 8, // ROLE
        required: false,
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

    for (const gId of guildIds) {
      try {
        await rest.put(Routes.applicationGuildCommands(clientId, gId), {
          body: commands,
        });
        console.log('✓ Successfully registered commands for guild', gId);
      } catch (err) {
        console.error('✗ Failed to register commands for guild', gId, err);
      }
    }
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
})();
