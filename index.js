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
    return message.reply('Usage: !addrole <roleId> <comma-separated usernames (e.g., mytg,anotheruser)>');
  }

  const roleId = args[1];
  const usernamesStr = args.slice(2).join(' ');
  const usernames = usernamesStr
    .split(',')
    .map(u => u.trim().toLowerCase())  // Convert all usernames to lowercase
    .filter(u => u.length > 0);

  if (usernames.length === 0) {
    console.log(`[ERROR] No valid usernames provided.`);
    return message.reply('❌ No valid usernames provided.');
  }

  const role = message.guild.roles.cache.get(roleId);
  if (!role) {
    console.log(`[ERROR] Role with ID ${roleId} not found.`);
    return message.reply(`❌ Role with ID ${roleId} not found.`);
  }

  console.log(`[ROLE] Target role: ${role.name} (${role.id})`);

  // Check if user has permission to assign this role
  if (message.member.roles.highest.comparePositionTo(role) <= 0) {
    console.log(`[PERMISSION] User ${message.author.tag} does not have permission to assign ${role.name}.`);
    return message.reply(`❌ You cannot assign the role ${role.name} because it is higher or equal to your highest role.`);
  }

  const botMember = await message.guild.members.fetch(client.user.id);
  if (botMember.roles.highest.comparePositionTo(role) <= 0) {
    console.log(`[PERMISSION] Bot lacks permission to assign ${role.name}.`);
    return message.reply(`❌ I cannot assign the role ${role.name} because it is higher or equal to my highest role.`);
  }

  // Send the initial "Processing..." message
  const processingMessage = await message.reply('Processing... Please wait.');

  let success = [];
  let failed = [];

  try {
    console.log(`[FETCH] Fetching all members...`);
    const fetchedMembers = await message.guild.members.fetch();
    console.log(`[FETCH] Fetched ${fetchedMembers.size} members.`);

    for (const username of usernames) {
      let member = fetchedMembers.find(m => m.user.tag.toLowerCase() === username);  // Compare as lowercase

      if (!member) {
        console.log(`[ERROR] No exact match found for '${username}'.`);
        failed.push(username);
        continue;
      }

      console.log(`[FOUND] Exact match: ${username} -> ${member.user.tag} (${member.id})`);

      try {
        await member.roles.add(role);
        console.log(`[SUCCESS] Added ${role.name} to ${member.user.tag}`);
        success.push(member.user.tag);
      } catch (err) {
        console.error(`[ERROR] Failed to add ${role.name} to ${member.user.tag}:`, err);
        failed.push(member.user.tag);
      }
    }
  } catch (err) {
    console.error(`[ERROR] Failed to fetch members:`, err);
    return message.reply(`❌ Error fetching members. Please try again later.`);
  }

  let replyMessage = '';
  if (success.length > 0) {
    replyMessage += `✅ ${role.name} added to: ${success.join(', ')}\n`;
  }
  if (failed.length > 0) {
    replyMessage += `❌ Failed to add ${role.name} to: ${failed.join(', ')}`;
  }

  console.log(`[RESULT] ${replyMessage}`);

  // Split the message if it's too long (over 2000 characters)
  const chunkSize = 2000;
  let remainingMessage = replyMessage;

  while (remainingMessage.length > chunkSize) {
    const chunk = remainingMessage.slice(0, chunkSize);
    await processingMessage.reply(chunk);
    remainingMessage = remainingMessage.slice(chunkSize);
  }

  // Send the remaining part
  if (remainingMessage.length > 0) {
    await processingMessage.reply(remainingMessage);
  }
});

client.login(TOKEN);
