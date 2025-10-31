require('dotenv').config();

const clientId = process.env.CLIENT_ID;
if (!clientId) {
  console.error('Missing CLIENT_ID in .env');
  process.exit(1);
}
// Minimal permissions: Send Messages (2048) + Embed Links (16384) = 18432
const permissions = 18432;
const scopes = encodeURIComponent('bot applications.commands');
const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;

console.log('\nInvite your bot using this URL:\n');
console.log(url + '\n');
