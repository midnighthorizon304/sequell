// Adds verified + verified_at columns to the supplements table.
// Requires a Supabase personal access token:
//   SUPABASE_TOKEN=<token> node scripts/run-migration-003.js
// Get your token at: https://supabase.com/dashboard/account/tokens
import { readFileSync } from 'fs'

const TOKEN      = process.env.SUPABASE_TOKEN
const PROJECT_ID = 'gxnlyfpsntaascrzemrm'

if (!TOKEN) {
  console.error('Missing SUPABASE_TOKEN env var.')
  console.error('Get one at https://supabase.com/dashboard/account/tokens then run:')
  console.error('  SUPABASE_TOKEN=sbp_xxx node scripts/run-migration-003.js')
  process.exit(1)
}

const sql = readFileSync(new URL('../supabase/migrations/003_verified.sql', import.meta.url), 'utf8')

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
  {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query: sql }),
  }
)

if (res.ok) {
  console.log('✓ Migration 003 applied — verified + verified_at columns added.')
} else {
  const body = await res.text()
  console.error('✗ Migration failed:', body)
  process.exit(1)
}
