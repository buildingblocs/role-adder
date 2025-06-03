const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;

client.once('ready', () => {
  console.log(`[BOT] Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!addrole')) return;

  console.log(`[COMMAND] Received: ${message.content} from ${message.author.tag}`);

  const args = message.content.split(' ');
  if (args.length < 3) {
    console.log(`[ERROR] Invalid command format.`);
    return message.reply('Usage: !addrole <roleId> <comma-separated user IDs>');
  }

  const roleId = args[1];
  const userIdsStr = args.slice(2).join(' ');
  const userIds = userIdsStr
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);

  if (userIds.length === 0) {
    console.log(`[ERROR] No valid user IDs provided.`);
    return message.reply('❌ No valid user IDs provided.');
  }

  const role = message.guild.roles.cache.get(roleId);
  if (!role) {
    console.log(`[ERROR] Role with ID ${roleId} not found.`);
    return message.reply(`❌ Role with ID ${roleId} not found.`);
  }

  console.log(`[ROLE] Target role: ${role.name} (${role.id})`);

  if (message.member.roles.highest.comparePositionTo(role) <= 0) {
    console.log(`[PERMISSION] User ${message.author.tag} does not have permission to assign ${role.name}.`);
    return message.reply(`❌ You cannot assign the role ${role.name} because it is higher or equal to your highest role.`);
  }

  const botMember = await message.guild.members.fetch(client.user.id);
  if (botMember.roles.highest.comparePositionTo(role) <= 0) {
    console.log(`[PERMISSION] Bot lacks permission to assign ${role.name}.`);
    return message.reply(`❌ I cannot assign the role ${role.name} because it is higher or equal to my highest role.`);
  }

  const processingMessage = await message.reply('Processing... Please wait.');

  let success = [];
  let failed = [];

  for (const userId of userIds) {
    try {
      const member = await message.guild.members.fetch(userId);
      await member.roles.add(role);
      console.log(`[SUCCESS] Added ${role.name} to ${member.user.tag}`);
      success.push(member.user.tag);
    } catch (err) {
      console.error(`[ERROR] Failed to add ${role.name} to user ID ${userId}:`, err);
      failed.push(userId);
    }
  }

  let replyMessage = '';
  if (success.length > 0) {
    replyMessage += `✅ ${role.name} added to: ${success.join(', ')}\n`;
  }
  if (failed.length > 0) {
    replyMessage += `❌ Failed to add ${role.name} to: ${failed.join(', ')}`;
  }

  console.log(`[RESULT] ${replyMessage}`);

  const chunkSize = 2000;
  let remainingMessage = replyMessage;

  while (remainingMessage.length > chunkSize) {
    const chunk = remainingMessage.slice(0, chunkSize);
    await processingMessage.reply(chunk);
    remainingMessage = remainingMessage.slice(chunkSize);
  }

  if (remainingMessage.length > 0) {
    await processingMessage.reply(remainingMessage);
  }
});

client.login(TOKEN);
