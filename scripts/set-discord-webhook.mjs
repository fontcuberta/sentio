import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
if (!DISCORD_WEBHOOK_URL) throw new Error('DISCORD_WEBHOOK_URL is not set');

const sql = neon(DATABASE_URL);

async function run() {
  // Update ALL teams in the DB (seed-only data in this capstone).
  const res = await sql`
    UPDATE teams
    SET discord_webhook_url = ${DISCORD_WEBHOOK_URL}
  `;

  console.log('Updated teams discord_webhook_url to provided value.');
  console.log('Result:', res);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

