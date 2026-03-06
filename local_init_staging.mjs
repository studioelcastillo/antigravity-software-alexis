import pg from 'pg';
const { Client } = pg;
import fs from 'fs';

const PROJECT_ID = 'pnnrsqocukixusmzrlhy';
const PASSWORD = 'LivstrePruebas2026_SecuR3!';
const connectionString = `postgresql://postgres.${PROJECT_ID}:${PASSWORD}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;

const file = 'supabase/full_init_cleaned.sql';

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    console.log(`Connecting to ${PROJECT_ID}...`);
    await client.connect();
    console.log('Connected successfully. Executing SQL...');

    const sql = fs.readFileSync(file, 'utf8');
    await client.query(sql);
    console.log('SUCCESS: Database initialized.');
  } catch (err) {
    console.error('Error during SQL execution:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
