require('dotenv').config();

const {
	Client,
	GatewayIntentBits,
	PermissionsBitField,
	ChannelType,
	EmbedBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
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
	// Handle slash command
	if (interaction.isChatInputCommand() && interaction.commandName === 'announce') {
		try {
			const providedMsg = interaction.options.getString('message', false);
			const channelOption = interaction.options.getChannel('channel', true);

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

				// Resolve destination channel (required by command)
				if (
					channelOption.type !== ChannelType.GuildText &&
					channelOption.type !== ChannelType.GuildAnnouncement
				) {
					return interaction.reply({
						content: 'Please choose a Text or Announcement channel.',
						ephemeral: true,
					});
				}
				const targetChannel = channelOption;

				// If no message provided, open a modal for multiline input
				if (!providedMsg) {
					const modal = new ModalBuilder()
						.setCustomId(`announce-modal:${targetChannel.id}`)
						.setTitle('Compose announcement');

					const messageInput = new TextInputBuilder()
						.setCustomId('announce-message')
						.setLabel('Announcement message')
						.setStyle(TextInputStyle.Paragraph)
						.setRequired(true)
						.setMaxLength(1900);

					const row = new ActionRowBuilder().addComponents(messageInput);
					modal.addComponents(row);
					return interaction.showModal(modal);
				}

				const embed = new EmbedBuilder()
					.setTitle('📢 Announcement')
					.setDescription(providedMsg)
					.setColor(0x5865f2)
					.setTimestamp()
					.setFooter({ text: `From ${interaction.user.tag}` });

				await targetChannel.send({ embeds: [embed] });
				return interaction.reply({
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
		}

		// Handle modal submit for multiline announcement
		if (
			interaction.isModalSubmit() &&
			typeof interaction.customId === 'string' &&
			interaction.customId.startsWith('announce-modal:')
		) {
			try {
				const channelId = interaction.customId.split(':')[1];
				const msg = interaction.fields.getTextInputValue('announce-message').trim();

				if (!msg) {
					return interaction.reply({
						content: 'Message cannot be empty.',
						ephemeral: true,
					});
				}

				// Permission gate again (defense in depth)
				const allowedRoleId = process.env.ALLOWED_ROLE_ID;
				const hasAdmin = interaction.memberPermissions?.has(
					PermissionsBitField.Flags.Administrator
				);
				const hasManageGuild = interaction.memberPermissions?.has(
					PermissionsBitField.Flags.ManageGuild
				);
				let hasAllowedRole = false;
				if (allowedRoleId) {
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

				let targetChannel = null;
				try {
					targetChannel = await interaction.guild.channels.fetch(channelId);
				} catch (_) {
					try {
						targetChannel = await interaction.client.channels.fetch(channelId);
					} catch (e) {
						console.error('Failed to fetch channel from modal:', e);
					}
				}
				if (!targetChannel) {
					return interaction.reply({
						content: 'Could not find the selected channel.',
						ephemeral: true,
					});
				}
				if (
					targetChannel.type !== ChannelType.GuildText &&
					targetChannel.type !== ChannelType.GuildAnnouncement
				) {
					return interaction.reply({
						content: 'Selected channel is not a text/announcement channel.',
						ephemeral: true,
					});
				}

				const embed = new EmbedBuilder()
					.setTitle('📢 Announcement')
					.setDescription(msg)
					.setColor(0x5865f2)
					.setTimestamp()
					.setFooter({ text: `From ${interaction.user.tag}` });

				await targetChannel.send({ embeds: [embed] });
				return interaction.reply({
					content: `Announcement sent to #${targetChannel.name}.`,
					ephemeral: true,
				});
			} catch (err) {
				console.error('Error handling announce modal:', err);
				if (interaction.deferred || interaction.replied) {
					await interaction.followUp({
						content: 'There was an error submitting the announcement.',
						ephemeral: true,
					});
				} else {
					await interaction.reply({
						content: 'There was an error submitting the announcement.',
						ephemeral: true,
					});
				}
			}
		}
	});

client.login(token);

