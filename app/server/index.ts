import crypto from 'node:crypto'
import express, { type Request, type Response, type NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import { pool, initDb } from './db.js'

const PORT = Number(process.env.PORT || 4000)
const SECRET = process.env.SESSION_SECRET || 'dev-only-session-secret'
const COOKIE = 'latent_uid'
const DAY = 86_400_000

const app = express()
app.use(express.json({ limit: '64kb' }))
app.use(cookieParser())

const sign = (id: string) => crypto.createHmac('sha256', SECRET).update(id).digest('base64url')

function cookieValue(id: string) {
  return `${id}.${sign(id)}`
}

function readUserId(req: Request): string | null {
  const raw = req.cookies?.[COOKIE]
  if (typeof raw !== 'string' || !raw.includes('.')) return null
  const [id, sig] = raw.split('.')
  if (!id || !sig) return null
  const expected = sign(id)
  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  return id
}

type User = {
  id: string
  handle: string
  display_name: string
  avatar_hue: number
  bio: string
}

async function currentUser(req: Request): Promise<User | null> {
  const id = readUserId(req)
  if (!id) return null
  const { rows } = await pool.query<User>(
    'select id, handle, display_name, avatar_hue, bio from users where id = $1',
    [id],
  )
  return rows[0] ?? null
}

function requireUser(handler: (req: Request, res: Response, user: User) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await currentUser(req)
      if (!user) {
        res.status(401).json({ error: 'Not signed in' })
        return
      }
      await handler(req, res, user)
    } catch (error) {
      next(error)
    }
  }
}

const dayKey = (date: Date) => date.toISOString().slice(0, 10)
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY)
const startOfUtcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

async function dailyTotals(userId: string) {
  const { rows } = await pool.query<{ day: string; seconds: number; sessions: number }>(
    `select to_char(started_at::date, 'YYYY-MM-DD') as day,
            sum(duration_seconds)::int as seconds,
            count(*)::int as sessions
       from sessions
      where user_id = $1
      group by 1`,
    [userId],
  )
  return new Map(rows.map((row) => [row.day, { seconds: row.seconds, sessions: row.sessions }]))
}

function streakFrom(days: Map<string, { seconds: number }>) {
  const today = startOfUtcDay(new Date())
  let cursor = days.has(dayKey(today)) ? today : addDays(today, -1)
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

function todaySecondsFrom(days: Map<string, { seconds: number }>) {
  return days.get(dayKey(new Date()))?.seconds ?? 0
}

async function proof(userId: string) {
  const days = await dailyTotals(userId)
  const today = startOfUtcDay(new Date())

  const heatmap = Array.from({ length: 119 }, (_, index) => {
    const date = dayKey(addDays(today, index - 118))
    return { date, seconds: days.get(date)?.seconds ?? 0 }
  })

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = dayKey(addDays(today, index - 6))
    return { date, seconds: days.get(date)?.seconds ?? 0 }
  })

  const sum = (entries: { seconds: number }[]) => entries.reduce((total, entry) => total + entry.seconds, 0)
  const thisWeek = sum(week)
  const lastWeek = sum(
    Array.from({ length: 7 }, (_, index) => ({ seconds: days.get(dayKey(addDays(today, index - 13)))?.seconds ?? 0 })),
  )

  const { rows: totals } = await pool.query<{ seconds: number; count: number; longest: number }>(
    `select coalesce(sum(duration_seconds), 0)::int as seconds,
            count(*)::int as count,
            coalesce(max(duration_seconds), 0)::int as longest
       from sessions where user_id = $1`,
    [userId],
  )

  const last30 = Array.from({ length: 30 }, (_, index) => days.get(dayKey(addDays(today, index - 29)))?.seconds ?? 0)

  const { rows: recent } = await pool.query(
    `select s.id, s.started_at, s.ended_at, s.duration_seconds, s.mode, s.camera_on, s.visibility,
            t.name as tag_name, t.color as tag_color
       from sessions s left join tags t on t.id = s.tag_id
      where s.user_id = $1
      order by s.started_at desc
      limit 12`,
    [userId],
  )

  return {
    totals: {
      seconds: totals[0].seconds,
      sessions: totals[0].count,
      longest: totals[0].longest,
      dailyAverage: Math.round(last30.reduce((a, b) => a + b, 0) / 30),
    },
    streak: streakFrom(days),
    todaySeconds: todaySecondsFrom(days),
    heatmap,
    week,
    trend: {
      thisWeek,
      lastWeek,
      percent: lastWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round(((thisWeek - lastWeek) / lastWeek) * 100),
    },
    recent,
  }
}

const cleanHandle = (value: unknown) =>
  typeof value === 'string' ? value.trim().replace(/^@+/, '').toLowerCase() : ''

const titleCase = (handle: string) => handle.charAt(0).toUpperCase() + handle.slice(1)

app.get('/api/health', async (_req, res) => {
  await pool.query('select 1')
  res.json({ ok: true })
})

app.get('/api/me', async (req, res, next) => {
  try {
    const user = await currentUser(req)
    if (!user) {
      res.json({ user: null })
      return
    }
    const days = await dailyTotals(user.id)
    res.json({ user, todaySeconds: todaySecondsFrom(days), streak: streakFrom(days) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/start', async (req, res, next) => {
  try {
    const handle = cleanHandle(req.body?.handle)
    if (!/^[a-z0-9._]{2,20}$/.test(handle)) {
      res.status(400).json({ error: 'Use 2–20 letters, numbers, dots or underscores.' })
      return
    }
    const displayName =
      typeof req.body?.displayName === 'string' && req.body.displayName.trim()
        ? req.body.displayName.trim().slice(0, 40)
        : titleCase(handle)

    let { rows } = await pool.query<User>(
      'select id, handle, display_name, avatar_hue, bio from users where handle = $1',
      [handle],
    )
    if (!rows[0]) {
      const hue = Math.floor(Math.random() * 360)
      const created = await pool.query<User>(
        `insert into users (handle, display_name, avatar_hue, bio)
         values ($1, $2, $3, '') returning id, handle, display_name, avatar_hue, bio`,
        [handle, displayName, hue],
      )
      rows = created.rows
      const presets = [
        { name: 'Deep work', color: '#8FB08A' },
        { name: 'Study', color: '#7FA6C8' },
        { name: 'Practice', color: '#C58FA8' },
      ]
      for (const tag of presets) {
        await pool.query('insert into tags (user_id, name, color) values ($1, $2, $3) on conflict do nothing', [
          rows[0].id,
          tag.name,
          tag.color,
        ])
      }
      const demo = await pool.query<{ id: string }>(`select id from users where handle = 'malcolm'`)
      if (demo.rows[0]) {
        await pool.query(
          'insert into friendships (user_id, friend_id) select $1, unnest(array(select id from users where id <> $1)) on conflict do nothing',
          [rows[0].id],
        )
        await pool.query(
          'insert into friendships (user_id, friend_id) select unnest(array(select id from users where id <> $1)), $1 on conflict do nothing',
          [rows[0].id],
        )
      }
    }

    res.cookie(COOKIE, cookieValue(rows[0].id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 365,
    })
    res.json({ user: rows[0] })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(COOKIE, { path: '/' })
  res.json({ ok: true })
})

app.get('/api/tags', requireUser(async (_req, res, user) => {
  const { rows } = await pool.query(
    'select id, name, color from tags where user_id = $1 order by created_at asc',
    [user.id],
  )
  res.json({ tags: rows })
}))

app.get('/api/home', requireUser(async (_req, res, user) => {
  const days = await dailyTotals(user.id)
  const { rows: tags } = await pool.query(
    'select id, name, color from tags where user_id = $1 order by created_at asc',
    [user.id],
  )
  const { rows: live } = await pool.query(
    `select u.id, u.handle, u.display_name, u.avatar_hue,
            extract(epoch from (now() - u.live_since))::int as live_seconds
       from users u
      where u.live_since > now() - interval '4 hours'
        and u.id in (select friend_id from friendships where user_id = $1)
      order by u.live_since asc`,
    [user.id],
  )
  res.json({
    user,
    tags,
    todaySeconds: todaySecondsFrom(days),
    streak: streakFrom(days),
    live,
  })
}))

app.post('/api/sessions', requireUser(async (req, res, user) => {
  const startedAt = new Date(String(req.body?.startedAt ?? ''))
  const endedAt = new Date(String(req.body?.endedAt ?? ''))
  const durationSeconds = Math.round(Number(req.body?.durationSeconds))
  const mode = ['stopwatch', 'goal', 'pomodoro'].includes(req.body?.mode) ? req.body.mode : 'stopwatch'
  const cameraOn = req.body?.cameraOn !== false
  const visibility = req.body?.visibility === 'friends' ? 'friends' : 'private'
  const tagName = typeof req.body?.tagName === 'string' ? req.body.tagName.trim().slice(0, 32) : ''

  if (
    Number.isNaN(startedAt.getTime()) ||
    Number.isNaN(endedAt.getTime()) ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 1 ||
    durationSeconds > 60 * 60 * 18 ||
    endedAt <= startedAt
  ) {
    res.status(400).json({ error: 'That session is not valid.' })
    return
  }

  let tagId: string | null = null
  if (tagName) {
    const existing = await pool.query<{ id: string }>('select id from tags where user_id = $1 and lower(name) = lower($2)', [
      user.id,
      tagName,
    ])
    if (existing.rows[0]) {
      tagId = existing.rows[0].id
    } else {
      const created = await pool.query<{ id: string }>(
        'insert into tags (user_id, name, color) values ($1, $2, $3) returning id',
        [user.id, tagName, '#B8A37F'],
      )
      tagId = created.rows[0].id
    }
  }

  const { rows } = await pool.query(
    `insert into sessions (user_id, tag_id, started_at, ended_at, duration_seconds, mode, camera_on, visibility)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning id, started_at, ended_at, duration_seconds, mode, camera_on, visibility`,
    [user.id, tagId, startedAt, endedAt, durationSeconds, mode, cameraOn, visibility],
  )

  const days = await dailyTotals(user.id)
  res.status(201).json({
    session: { ...rows[0], tag_name: tagName || null },
    streak: streakFrom(days),
    todaySeconds: todaySecondsFrom(days),
  })
}))

app.get('/api/sessions', requireUser(async (req, res, user) => {
  const limit = Math.min(Number(req.query.limit) || 60, 200)
  const { rows } = await pool.query(
    `select s.id, s.started_at, s.ended_at, s.duration_seconds, s.mode, s.camera_on, s.visibility,
            t.name as tag_name, t.color as tag_color
       from sessions s left join tags t on t.id = s.tag_id
      where s.user_id = $1
      order by s.started_at desc
      limit $2`,
    [user.id, limit],
  )
  res.json({ sessions: rows })
}))

app.delete('/api/sessions/:id', requireUser(async (req, res, user) => {
  const result = await pool.query('delete from sessions where id = $1 and user_id = $2', [req.params.id, user.id])
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  res.json({ ok: true })
}))

app.get('/api/stats', requireUser(async (_req, res, user) => {
  res.json(await proof(user.id))
}))

app.get('/api/feed', requireUser(async (_req, res, user) => {
  const { rows } = await pool.query(
    `select s.id, s.started_at, s.ended_at, s.duration_seconds, s.mode, s.camera_on,
            u.id as user_id, u.handle, u.display_name, u.avatar_hue,
            t.name as tag_name, t.color as tag_color,
            (select count(*)::int from kudos k where k.session_id = s.id) as kudos_count,
            (select count(*)::int from comments c where c.session_id = s.id) as comment_count,
            exists(select 1 from kudos k where k.session_id = s.id and k.user_id = $1) as liked
       from sessions s
       join users u on u.id = s.user_id
       left join tags t on t.id = s.tag_id
      where s.visibility = 'friends'
        and (s.user_id = $1 or s.user_id in (select friend_id from friendships where user_id = $1))
      order by s.started_at desc
      limit 20`,
    [user.id],
  )

  const ids = rows.map((row) => row.id)
  const comments = ids.length
    ? await pool.query(
        `select c.id, c.session_id, c.body, c.created_at, u.handle, u.display_name, u.avatar_hue
           from comments c join users u on u.id = c.user_id
          where c.session_id = any($1::uuid[])
          order by c.created_at asc`,
        [ids],
      )
    : { rows: [] as any[] }

  const kudosGivers = ids.length
    ? await pool.query(
        `select k.session_id, u.display_name
           from kudos k join users u on u.id = k.user_id
          where k.session_id = any($1::uuid[])
          order by k.created_at asc`,
        [ids],
      )
    : { rows: [] as any[] }

  res.json({
    posts: rows.map((row) => ({
      ...row,
      comments: comments.rows.filter((comment) => comment.session_id === row.id),
      kudos_givers: kudosGivers.rows.filter((giver) => giver.session_id === row.id).map((giver) => giver.display_name),
    })),
  })
}))

app.post('/api/sessions/:id/kudos', requireUser(async (req, res, user) => {
  const { rows } = await pool.query('select id from sessions where id = $1', [req.params.id])
  if (!rows[0]) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  const existing = await pool.query('select 1 from kudos where session_id = $1 and user_id = $2', [
    req.params.id,
    user.id,
  ])
  if (existing.rowCount) {
    await pool.query('delete from kudos where session_id = $1 and user_id = $2', [req.params.id, user.id])
  } else {
    await pool.query('insert into kudos (session_id, user_id) values ($1, $2)', [req.params.id, user.id])
  }
  const { rows: count } = await pool.query<{ count: number }>(
    'select count(*)::int as count from kudos where session_id = $1',
    [req.params.id],
  )
  res.json({ liked: !existing.rowCount, count: count[0].count })
}))

app.post('/api/sessions/:id/comments', requireUser(async (req, res, user) => {
  const body = typeof req.body?.body === 'string' ? req.body.body.trim().slice(0, 240) : ''
  if (!body) {
    res.status(400).json({ error: 'Write something first.' })
    return
  }
  const { rows } = await pool.query('select id from sessions where id = $1', [req.params.id])
  if (!rows[0]) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  const created = await pool.query(
    `insert into comments (session_id, user_id, body) values ($1, $2, $3)
     returning id, session_id, body, created_at`,
    [req.params.id, user.id, body],
  )
  res.status(201).json({
    comment: { ...created.rows[0], handle: user.handle, display_name: user.display_name, avatar_hue: user.avatar_hue },
  })
}))

app.get('/api/group', requireUser(async (_req, res, user) => {
  const circle = `(u.id = $1 or u.id in (select friend_id from friendships where user_id = $1))`

  const { rows } = await pool.query(
    `select u.id, u.handle, u.display_name, u.avatar_hue,
            coalesce(sum(s.duration_seconds), 0)::int as seconds,
            count(s.id)::int as sessions
       from users u
       left join sessions s on s.user_id = u.id and s.started_at > now() - interval '7 days'
      where ${circle}
      group by u.id
      order by seconds desc, u.display_name asc`,
    [user.id],
  )

  const { rows: live } = await pool.query(
    `select u.id, u.handle, u.display_name, u.avatar_hue,
            extract(epoch from (now() - u.live_since))::int as live_seconds,
            (select t.name from sessions s left join tags t on t.id = s.tag_id
              where s.user_id = u.id order by s.started_at desc limit 1) as tag_name
       from users u
      where u.live_since > now() - interval '4 hours'
        and ${circle}
      order by u.live_since asc`,
    [user.id],
  )

  const top = rows.slice(0, 3)
  const series = await Promise.all(
    top.map(async (row) => {
      const { rows: daily } = await pool.query<{ day: string; seconds: number }>(
        `select to_char(started_at::date, 'YYYY-MM-DD') as day, sum(duration_seconds)::int as seconds
           from sessions
          where user_id = $1 and started_at > now() - interval '7 days'
          group by 1`,
        [row.id],
      )
      const byDay = new Map(daily.map((entry) => [entry.day, entry.seconds]))
      const points = Array.from({ length: 7 }, (_, index) => {
        const date = dayKey(addDays(startOfUtcDay(new Date()), index - 6))
        return byDay.get(date) ?? 0
      })
      return { user_id: row.id, handle: row.handle, avatar_hue: row.avatar_hue, points }
    }),
  )

  res.json({ leaderboard: rows, live, series })
}))

app.post('/api/nudges', requireUser(async (req, res, user) => {
  const toUserId = String(req.body?.toUserId ?? '')
  if (!toUserId) {
    res.status(400).json({ error: 'Pick a friend first.' })
    return
  }
  const friend = await pool.query('select 1 from friendships where user_id = $1 and friend_id = $2', [user.id, toUserId])
  if (!friend.rowCount) {
    res.status(403).json({ error: 'Not in your circle' })
    return
  }
  await pool.query('insert into nudges (from_user_id, to_user_id) values ($1, $2)', [user.id, toUserId])
  res.json({ ok: true })
}))

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api]', error)
  res.status(500).json({ error: 'Something went wrong on our side.' })
})

async function main() {
  await initDb()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api] listening on 0.0.0.0:${PORT}`)
  })
}

main().catch((error) => {
  console.error('[api] failed to start', error)
  process.exit(1)
})
