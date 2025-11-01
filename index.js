require('dotenv').config();
const http = require('http');

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
	ButtonBuilder,
	ButtonStyle,
  ActivityType,
} = require('discord.js');
const { randomUUID } = require('crypto');

// In-memory store for announcement previews
	const previews = new Map(); // id -> { userId, channelId, msg, mentionChannelId, roleId, pingEveryone, createdAt }

	function renderMessage(text, mentionChannelId, roleId) {
		if (!text) return text;
		let out = text;
		if (mentionChannelId) {
			// Replace {channel} token with a clickable channel mention
			out = out.replaceAll('{channel}', `<#${mentionChannelId}>`);
		}
		if (roleId) {
			// Replace {role} token with a role mention
			out = out.replaceAll('{role}', `<@&${roleId}>`);
		}
		return out;
	}

const token = process.env.TOKEN;
const disableBot = process.env.DISABLE_BOT === 'true';
if (!token) {
	console.error('Missing TOKEN in environment. Create a .env file with TOKEN=your_bot_token');
	process.exit(1);
}

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

client.once('ready', (c) => {
	console.log(`Logged in as ${c.user.tag}`);
	// Set presence to "Listening to /announce"
	c.user.setPresence({
		activities: [{ name: '/announce', type: ActivityType.Listening }],
		status: 'online',
	});
});

client.on('interactionCreate', async (interaction) => {
		// Handle slash command
	if (interaction.isChatInputCommand() && interaction.commandName === 'announce') {
		try {
			const providedMsg = interaction.options.getString('message', false);
			const channelOption = interaction.options.getChannel('channel', true);
			const mentionOption = interaction.options.getChannel('mention', false);
			const roleOption = interaction.options.getRole('role', false);
			const pingEveryone = interaction.options.getBoolean('ping_everyone', false) === true;

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

						// Validate mention channel if provided
						let mentionChannelId = null;
						if (mentionOption) {
							if (
								mentionOption.type !== ChannelType.GuildText &&
								mentionOption.type !== ChannelType.GuildAnnouncement
							) {
								return interaction.reply({
									content: 'Please choose a Text or Announcement channel to mention.',
									ephemeral: true,
								});
							}
							mentionChannelId = mentionOption.id;
						}

						const roleId = roleOption?.id ?? null;

				// If no message provided, open a modal for multiline input
						if (!providedMsg) {
					const modal = new ModalBuilder()
								.setCustomId(`announce-modal:${targetChannel.id}:${mentionChannelId ?? '0'}:${pingEveryone ? '1' : '0'}:${roleId ?? '0'}`)
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
											.setDescription(renderMessage(providedMsg, mentionChannelId, roleId))
									.setColor(0x5865f2)
									.setTimestamp();

						// Show preview with Confirm/Cancel buttons
						const id = randomUUID();
									previews.set(id, {
							userId: interaction.user.id,
							channelId: targetChannel.id,
											msg: renderMessage(providedMsg, mentionChannelId, roleId),
											mentionChannelId,
											roleId,
									pingEveryone,
							createdAt: Date.now(),
						});

						const row = new ActionRowBuilder().addComponents(
							new ButtonBuilder()
								.setCustomId(`announce-confirm:${id}`)
								.setLabel('Send')
								.setStyle(ButtonStyle.Success),
							new ButtonBuilder()
								.setCustomId(`announce-cancel:${id}`)
								.setLabel('Cancel')
								.setStyle(ButtonStyle.Secondary)
						);

						return interaction.reply({
							content: `Preview — will send to #${targetChannel.name}.`,
							embeds: [embed],
							components: [row],
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
					const parts = interaction.customId.split(':');
					const channelId = parts[1];
					const mentionChannelId = parts[2] && parts[2] !== '0' ? parts[2] : null;
						const pingEveryone = parts[3] === '1';
						const roleId = parts[4] && parts[4] !== '0' ? parts[4] : null;
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
											.setDescription(renderMessage(msg, mentionChannelId, roleId))
									.setColor(0x5865f2)
									.setTimestamp();

						// Show preview with Confirm/Cancel buttons
						const id = randomUUID();
									previews.set(id, {
							userId: interaction.user.id,
											channelId,
											msg: renderMessage(msg, mentionChannelId, roleId),
											mentionChannelId,
											roleId,
									pingEveryone,
							createdAt: Date.now(),
						});

						const row = new ActionRowBuilder().addComponents(
							new ButtonBuilder()
								.setCustomId(`announce-confirm:${id}`)
								.setLabel('Send')
								.setStyle(ButtonStyle.Success),
							new ButtonBuilder()
								.setCustomId(`announce-cancel:${id}`)
								.setLabel('Cancel')
								.setStyle(ButtonStyle.Secondary)
						);

						return interaction.reply({
							content: 'Preview — will send to the selected channel.',
							embeds: [embed],
							components: [row],
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

				// Handle preview confirmation/cancellation
				if (interaction.isButton()) {
					try {
						const id = interaction.customId.split(':')[1];
						if (!id) return;
						const payload = previews.get(id);
						if (!payload) {
							return interaction.update({
								content: 'This preview has expired. Please run /announce again.',
								embeds: [],
								components: [],
							});
						}
						if (payload.userId !== interaction.user.id) {
							return interaction.reply({
								content: 'This preview is not yours.',
								ephemeral: true,
							});
						}

						const isConfirm = interaction.customId.startsWith('announce-confirm:');
						const isCancel = interaction.customId.startsWith('announce-cancel:');

						if (!isConfirm && !isCancel) return;

						if (isCancel) {
							previews.delete(id);
							return interaction.update({
								content: 'Announcement cancelled.',
								embeds: [],
								components: [],
							});
						}

						// Confirmed — send the message
						let targetChannel = null;
						try {
							targetChannel = await interaction.guild.channels.fetch(payload.channelId);
						} catch (_) {
							try {
								targetChannel = await interaction.client.channels.fetch(payload.channelId);
							} catch (e) {
								console.error('Failed to fetch channel during confirm:', e);
							}
						}
						if (
							!targetChannel ||
							(targetChannel.type !== ChannelType.GuildText &&
								targetChannel.type !== ChannelType.GuildAnnouncement)
						) {
							previews.delete(id);
							return interaction.update({
								content: 'Could not send: target channel unavailable or invalid.',
								embeds: [],
								components: [],
							});
						}

										const embed = new EmbedBuilder()
									.setTitle('📢 Announcement')
									.setDescription(payload.msg)
									.setColor(0x5865f2)
									.setTimestamp();

											// Mentions control: only allow @everyone or selected role if explicitly requested
											const allowedMentions = { parse: [], repliedUser: false, roles: [] };
											if (payload.pingEveryone) allowedMentions.parse.push('everyone');
											if (payload.roleId) allowedMentions.roles.push(payload.roleId);

											await targetChannel.send({ embeds: [embed], allowedMentions });
						previews.delete(id);
						return interaction.update({
							content: `Announcement sent to #${targetChannel.name}.`,
							embeds: [],
							components: [],
						});
					} catch (err) {
						console.error('Error handling preview button:', err);
						if (interaction.deferred || interaction.replied) {
							await interaction.followUp({
								content: 'There was an error handling your action.',
								ephemeral: true,
							});
						} else {
							await interaction.reply({
								content: 'There was an error handling your action.',
								ephemeral: true,
							});
						}
					}
				}
	});

if (disableBot) {
	console.log('DISABLE_BOT=true: skipping Discord login');
} else {
	client.login(token);
}

// Optional: start a tiny HTTP server when PORT is provided (e.g., Render Web Service)
const port = process.env.PORT;
if (port) {
	const server = http.createServer((req, res) => {
		res.writeHead(200, { 'Content-Type': 'text/plain' });
		res.end('OK');
	});
	server.listen(port, () => {
		console.log(`Health server listening on :${port}`);
	});
}

