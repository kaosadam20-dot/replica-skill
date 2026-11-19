import type { Pool, PoolClient } from 'pg'

type SeededUser = {
  key: string
  handle: string
  displayName: string
  hue: number
  bio: string
  liveMinutesAgo?: number
}

const USERS: SeededUser[] = [
  { key: 'me', handle: 'malcolm', displayName: 'Malcolm Reyes', hue: 42, bio: 'Building things after dark.' },
  { key: 'rj', handle: 'rjho', displayName: 'RJ Ho', hue: 205, bio: 'Med school, one session at a time.', liveMinutesAgo: 56 },
  { key: 'kai', handle: 'krabbykai', displayName: 'Kai Tanaka', hue: 155, bio: 'Learning to draw properly.' },
  { key: 'rosie', handle: 'rosie', displayName: 'Rosie Alvarez', hue: 330, bio: 'Thesis era.', liveMinutesAgo: 12 },
  { key: 'shlok', handle: 'shlok', displayName: 'Shlok Patel', hue: 268, bio: 'Shipping small things.', liveMinutesAgo: 41 },
  { key: 'aria', handle: 'aria', displayName: 'Aria Chen', hue: 12, bio: 'Piano, six days a week.' },
  { key: 'nico', handle: 'nico', displayName: 'Nico Brandt', hue: 190, bio: 'Deep work before sunrise.' },
]

const TAG_SETS: Record<string, { name: string; color: string }[]> = {
  me: [
    { name: 'Building', color: '#E7B44C' },
    { name: 'Deep work', color: '#8FB08A' },
    { name: 'Study', color: '#7FA6C8' },
    { name: 'Practice', color: '#C58FA8' },
    { name: 'Reading', color: '#B8A37F' },
  ],
  rj: [
    { name: 'Med school', color: '#7FA6C8' },
    { name: 'Interview prep', color: '#E7B44C' },
    { name: 'Reading', color: '#B8A37F' },
  ],
  kai: [
    { name: 'Drawing', color: '#C58FA8' },
    { name: 'Study', color: '#7FA6C8' },
  ],
  rosie: [
    { name: 'Thesis', color: '#8FB08A' },
    { name: 'Reading', color: '#B8A37F' },
  ],
  shlok: [
    { name: 'Shipping', color: '#E7B44C' },
    { name: 'Deep work', color: '#8FB08A' },
  ],
  aria: [
    { name: 'Piano', color: '#C58FA8' },
    { name: 'Practice', color: '#B8A37F' },
  ],
  nico: [
    { name: 'Deep work', color: '#8FB08A' },
    { name: 'Writing', color: '#7FA6C8' },
  ],
}

function makeRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const pick = <T,>(rnd: () => number, items: T[]): T => items[Math.floor(rnd() * items.length)]
const between = (rnd: () => number, min: number, max: number) => min + Math.floor(rnd() * (max - min + 1))

export async function seed(pool: Pool) {
  const client: PoolClient = await pool.connect()
  const rnd = makeRandom(20261119)
  try {
    await client.query('begin')

    const ids: Record<string, string> = {}
    for (const user of USERS) {
      const liveSince = user.liveMinutesAgo ? new Date(Date.now() - user.liveMinutesAgo * 60_000) : null
      const { rows } = await client.query<{ id: string }>(
        `insert into users (handle, display_name, avatar_hue, bio, live_since)
         values ($1, $2, $3, $4, $5) returning id`,
        [user.handle, user.displayName, user.hue, user.bio, liveSince],
      )
      ids[user.key] = rows[0].id
    }

    for (const user of USERS) {
      for (const tag of TAG_SETS[user.key]) {
        await client.query('insert into tags (user_id, name, color) values ($1, $2, $3)', [
          ids[user.key],
          tag.name,
          tag.color,
        ])
      }
    }

    for (const friend of USERS.filter((u) => u.key !== 'me')) {
      await client.query('insert into friendships (user_id, friend_id) values ($1, $2), ($2, $1)', [
        ids.me,
        ids[friend.key],
      ])
    }

    const tagsByUser: Record<string, { id: string; name: string }[]> = {}
    for (const user of USERS) {
      const { rows } = await client.query<{ id: string; name: string }>(
        'select id, name from tags where user_id = $1',
        [ids[user.key]],
      )
      tagsByUser[user.key] = rows
    }

    const inserted: { id: string; userId: string; visibility: string; tagName: string }[] = []

    for (const user of USERS) {
      const isMe = user.key === 'me'
      for (let dayOffset = 0; dayOffset < 120; dayOffset += 1) {
        const forced = isMe && dayOffset <= 9
        const roll = rnd()
        let count = roll > 0.62 ? 1 : roll > 0.28 ? 0 : 1
        if (forced) count = Math.max(1, count)
        if (rnd() > 0.82) count += 1
        if (!isMe && dayOffset > 45 && rnd() > 0.6) count = 0

        for (let n = 0; n < count; n += 1) {
          const tag = pick(rnd, tagsByUser[user.key])
          const durationMinutes = between(rnd, 25, 185)
          let start: Date
          if (dayOffset === 0) {
            start = new Date(Date.now() - (durationMinutes + between(rnd, 40, 180)) * 60_000)
          } else {
            start = new Date(Date.now() - dayOffset * 86_400_000)
            start.setUTCHours(between(rnd, 8, 20), pick(rnd, [0, 10, 20, 30, 40, 50]), 0, 0)
          }
          const end = new Date(start.getTime() + durationMinutes * 60_000)
          const visibility = isMe
            ? dayOffset <= 12 && rnd() > 0.55
              ? 'friends'
              : 'private'
            : rnd() > 0.45
              ? 'friends'
              : 'private'
          const mode = pick(rnd, ['stopwatch', 'stopwatch', 'goal', 'pomodoro'])
          const { rows } = await client.query<{ id: string }>(
            `insert into sessions
              (user_id, tag_id, started_at, ended_at, duration_seconds, mode, camera_on, visibility)
             values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
            [
              ids[user.key],
              tag.id,
              start,
              end,
              durationMinutes * 60,
              mode,
              rnd() > 0.12,
              visibility,
            ],
          )
          inserted.push({ id: rows[0].id, userId: ids[user.key], visibility, tagName: tag.name })
        }
      }
    }

    // Social activity on recent shared sessions.
    const shared = inserted.filter((s) => s.visibility === 'friends').slice(-14)
    const commentBodies = [
      'four hours before a 9am is unreal',
      'this is the streak I needed to see today',
      'the desk setup alone is accountability',
      'okay you are making me open the app',
      'comeback session, respect',
      'tagging mine the same way from now on',
    ]
    const friendKeys = USERS.map((u) => u.key)
    for (const [index, session] of shared.entries()) {
      const others = friendKeys.filter((key) => ids[key] !== session.userId)
      const kudosGivers = others.slice(0, between(rnd, 2, 5))
      for (const key of kudosGivers) {
        await client.query('insert into kudos (session_id, user_id) values ($1, $2) on conflict do nothing', [
          session.id,
          ids[key],
        ])
      }
      const commentCount = index % 3 === 0 ? 2 : index % 2 === 0 ? 1 : 0
      for (let c = 0; c < commentCount; c += 1) {
        await client.query('insert into comments (session_id, user_id, body) values ($1, $2, $3)', [
          session.id,
          ids[pick(rnd, others)],
          pick(rnd, commentBodies),
        ])
      }
    }

    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
