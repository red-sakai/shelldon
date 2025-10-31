# Shelldon – Simple Discord Announcement Bot

A minimal Discord bot that posts announcements to a channel via a slash command.

## What it does

- Registers a `/announce` command in your server (guild)
- Only users with Administrator, Manage Server, or an optional allowed role can use it
- Sends the message either to a provided channel option or a default channel from `.env`

## Prerequisites

- Node.js 18+
- A Discord Application + Bot (Developer Portal)
- The bot invited to your server with `bot` and `applications.commands` scopes

Recommended bot permissions when inviting: Send Messages, Embed Links.

## Setup

1) Copy the environment template and fill in your values:

```powershell
Copy-Item .env.example .env
# Then edit .env with your TOKEN, CLIENT_ID, GUILD_ID, etc.
```

2) Install dependencies:

```powershell
npm install
npm install dotenv
```

3) Register the slash command for your guild (server):

```powershell
npm run register
```

4) Start the bot:

```powershell
npm start
```

## Environment variables

- `TOKEN`: Your bot token
- `CLIENT_ID`: Your application (bot) client ID
- `GUILD_ID`: The guild (server) ID where you want `/announce` registered
- `ANNOUNCE_CHANNEL_ID` (optional): Default channel for announcements if the command's channel option is omitted
- `ALLOWED_ROLE_ID` (optional): A role that is allowed to use `/announce` (in addition to Admin/Manage Server)

## Using the command

- `/announce message:<text> channel:<#channel?>`
  - `message` is required
  - `channel` is optional; if omitted, the bot uses `ANNOUNCE_CHANNEL_ID`

Example:
- `/announce message:"Game night this Friday at 7 PM!" channel:#announcements`

## Notes

- This bot only needs the `Guilds` gateway intent. No privileged intents are required for the slash command workflow.
- If you change the command definition, re-run `npm run register` to update it in your guild.
- If you want the command globally (all servers), switch from `applicationGuildCommands` to `applicationCommands` in `register-commands.js` (global updates can take up to an hour).

## Troubleshooting

- "Missing TOKEN": Create a `.env` file and set `TOKEN`.
- "Could not find the default announcement channel": Ensure `ANNOUNCE_CHANNEL_ID` is correct and the bot can see/post in that channel.
- Permissions error: Confirm the user has Admin, Manage Server, or the `ALLOWED_ROLE_ID` role, and the bot has permission to send messages/embeds in the target channel.
