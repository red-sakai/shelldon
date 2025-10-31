require('dotenv').config();

const {
	Client,
	GatewayIntentBits,
	PermissionsBitField,
	ChannelType,
	EmbedBuilder,
} = require('discord.js');

const token = process.env.TOKEN;
if (!token) {
	console.error('Missing TOKEN in environment. Create a .env file with TOKEN=your_bot_token');
	process.exit(1);
}

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

client.once('ready', (c) => {
	console.log(`Logged in as ${c.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	if (interaction.commandName !== 'announce') return;

	try {
		const msg = interaction.options.getString('message', true);
		const channelOption = interaction.options.getChannel('channel', false);

		// Permission gate: Admin, Manage Guild, or ALLOWED_ROLE_ID
		const allowedRoleId = process.env.ALLOWED_ROLE_ID;
		const hasAdmin = interaction.memberPermissions?.has(
			PermissionsBitField.Flags.Administrator
		);
		const hasManageGuild = interaction.memberPermissions?.has(
			PermissionsBitField.Flags.ManageGuild
		);

		let hasAllowedRole = false;
		if (allowedRoleId) {
			// Handle both cached GuildMember and raw roles array
			const roles = interaction.member?.roles;
			if (roles?.cache) {
				hasAllowedRole = roles.cache.has(allowedRoleId);
			} else if (Array.isArray(interaction.member?.roles)) {
				hasAllowedRole = interaction.member.roles.includes(allowedRoleId);
			}
		}

		if (!hasAdmin && !hasManageGuild && !hasAllowedRole) {
			return interaction.reply({
				content:
					'You do not have permission to use this command. Required: Administrator, Manage Server, or the configured ALLOWED_ROLE_ID.',
				ephemeral: true,
			});
		}

		// Resolve destination channel
		let targetChannel = null;
		if (channelOption) {
			if (
				channelOption.type !== ChannelType.GuildText &&
				channelOption.type !== ChannelType.GuildAnnouncement
			) {
				return interaction.reply({
					content: 'Please choose a Text or Announcement channel.',
					ephemeral: true,
				});
			}
			targetChannel = channelOption;
		} else {
			const defaultChannelId = process.env.ANNOUNCE_CHANNEL_ID;
			if (!defaultChannelId) {
				return interaction.reply({
					content:
						'No channel provided and ANNOUNCE_CHANNEL_ID is not set. Provide a channel option or set ANNOUNCE_CHANNEL_ID in your .env.',
					ephemeral: true,
				});
			}
			try {
				// Prefer resolving within the same guild
				targetChannel = await interaction.guild.channels.fetch(defaultChannelId);
			} catch (_) {
				// Fallback: global fetch
				try {
					targetChannel = await client.channels.fetch(defaultChannelId);
				} catch (e) {
					console.error('Failed to fetch default channel:', e);
				}
			}

			if (!targetChannel) {
				return interaction.reply({
					content:
						'Could not find the default announcement channel. Check ANNOUNCE_CHANNEL_ID.',
					ephemeral: true,
				});
			}
			if (
				targetChannel.type !== ChannelType.GuildText &&
				targetChannel.type !== ChannelType.GuildAnnouncement
			) {
				return interaction.reply({
					content: 'The configured ANNOUNCE_CHANNEL_ID is not a text/announcement channel.',
					ephemeral: true,
				});
			}
		}

		const embed = new EmbedBuilder()
			.setTitle('📢 Announcement')
			.setDescription(msg)
			.setColor(0x5865f2)
			.setTimestamp()
			.setFooter({ text: `From ${interaction.user.tag}` });

		await targetChannel.send({ embeds: [embed] });
		await interaction.reply({
			content: `Announcement sent to #${targetChannel.name}.`,
			ephemeral: true,
		});
	} catch (err) {
		console.error('Error handling /announce:', err);
		if (interaction.deferred || interaction.replied) {
			await interaction.followUp({
				content: 'There was an error executing that command.',
				ephemeral: true,
			});
		} else {
			await interaction.reply({
				content: 'There was an error executing that command.',
				ephemeral: true,
			});
		}
	}
});

client.login(token);

