import { readFile } from 'node:fs/promises'
import { Pool } from 'pg'
import { seed } from './seed.js'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
})

export async function initDb() {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
  await pool.query(schema)
  const { rows } = await pool.query<{ count: string }>('select count(*)::text as count from users')
  if (rows[0].count === '0') {
    await seed(pool)
    console.log('[db] seeded demo data')
  }
}
