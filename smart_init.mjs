import pg from 'pg';
const { Client } = pg;
import fs from 'fs';

const PROJECT_ID = 'pnnrsqocukixusmzrlhy';
const PASSWORD = 'LivstrePruebas2026_SecuR3!';
const connectionString = `postgresql://postgres.${PROJECT_ID}:${PASSWORD}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected.');

    const sql = fs.readFileSync('supabase/full_init_cleaned.sql', 'utf8');

    // Split SQL by semicolons, but ignore those inside $$ blocks and single quotes
    const statements = [];
    let current = '';
    let inDollar = false;
    let inQuote = false;

    const lines = sql.split('\n');
    for (const line of lines) {
      current += line + '\n';

      // Toggle dollar quoting
      if (line.includes('$$')) inDollar = !inDollar;
      // Toggle single quoting (naive)
      const quoteCount = (line.match(/'/g) || []).length;
      if (quoteCount % 2 !== 0) inQuote = !inQuote;

      if (!inDollar && !inQuote && line.trim().endsWith(';')) {
        statements.push(current.trim());
        current = '';
      }
    }
    if (current.trim()) statements.push(current.trim());

    console.log(`Executing ${statements.length} statements...`);

    for (let i = 0; i < statements.length; i++) {
        const s = statements[i];
        if (!s) continue;
        try {
            await client.query(s);
        } catch (err) {
            console.error(`\n❌ Error in stmt ${i+1}:`, err.message);
            console.error('SQL:', s.substring(0, 200) + '...');
            // Optional: exit on error
            // process.exit(1);
        }
    }

    console.log('\n✅ Process finished.');
  } catch (err) {
    console.error('Fatal error:', err.message);
  } finally {
    await client.end();
  }
}

run();
