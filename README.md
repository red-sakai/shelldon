# Shelldon – Simple Discord Announcement Bot

A minimal Discord bot that posts announcements to a channel via a slash command. It also supports optional Facebook Page monitoring to post updates in your tech news channel.

## What it does

- Registers a `/announce` command in your server (guild)
- Multi-line compose via modal with preview + Confirm/Cancel
- Safe mentions: optional channel, role, and @everyone with explicit toggles
- Only users with Administrator, Manage Server, or an optional allowed role can use it
- Sends the message either to a provided channel option or a default channel from `.env`
- Optional: monitors a Facebook Page and posts new updates to a channel

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

3) Register the slash command for your guild(s):

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
- `GUILD_ID`: A single guild (server) ID where you want `/announce` registered
- `GUILD_IDS`: (Optional) Multiple guild IDs (comma or space separated) to register the command in several servers at once. If `GUILD_IDS` is set it overrides `GUILD_ID`.
- `ANNOUNCE_CHANNEL_ID` (optional): Default channel for announcements if the command's channel option is omitted
- `ALLOWED_ROLE_ID` (optional): A role that is allowed to use `/announce` (in addition to Admin/Manage Server)
- Facebook watcher (optional):
  - `TECH_NEWS_CHANNEL_ID`: Channel to post Facebook updates (e.g., your `#tech-news`)
  - `FB_PAGE_ID`: Facebook Page ID/username to monitor
  - `FB_ACCESS_TOKEN`: Page access token with `pages_read_engagement`
  - `FB_POLL_INTERVAL_SEC`: Poll interval in seconds (default 300, min 60)

## Using the command

- `/announce message:<text> channel:<#channel?>`
  - `message` is required
  - `channel` is optional; if omitted, the bot uses `ANNOUNCE_CHANNEL_ID`

Example:
- `/announce message:"Game night this Friday at 7 PM!" channel:#announcements`

## Using Facebook Page watcher (optional)

1) Create a Facebook App and obtain a Page access token with `pages_read_engagement`.
2) Set `FB_PAGE_ID`, `FB_ACCESS_TOKEN`, and `TECH_NEWS_CHANNEL_ID` in `.env`.
3) Restart the bot. On startup, it will poll every few minutes and post new items to your channel.

Notes:
- First run initializes the last seen post and does not backfill to avoid spam.
- It posts a link + embed for each new post (message text if available; otherwise just the link).
- If you deploy as a Web Service (e.g., Render), the bot exposes an `OK` health endpoint when `PORT` is set.

## Notes

- This bot only needs the `Guilds` gateway intent. No privileged intents are required for the slash command workflow.
- If you change the command definition, re-run `npm run register` to update it in your guild.
- If you want the command globally (all servers), switch from `applicationGuildCommands` to `applicationCommands` in `register-commands.js` (global updates can take up to an hour).

## Troubleshooting

- "Missing TOKEN": Create a `.env` file and set `TOKEN`.
- "Could not find the default announcement channel": Ensure `ANNOUNCE_CHANNEL_ID` is correct and the bot can see/post in that channel.
- Permissions error: Confirm the user has Admin, Manage Server, or the `ALLOWED_ROLE_ID` role, and the bot has permission to send messages/embeds in the target channel.
