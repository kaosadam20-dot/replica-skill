# Architecture: Latent Android clone

## Stack

| layer | choice | why |
| --- | --- | --- |
| client | Vite + React 18 + TypeScript | fast dev server, single mobile-first surface, easy to wrap for Android later |
| styling | hand-written CSS with design tokens | one small system, no utility framework to fight; tokens are the contract |
| API | Express (TypeScript, tsx watch) | one process, plain SQL, no ORM overhead for six tables |
| database | Postgres 16 in Compose | boring, real constraints, window functions for streaks |
| auth | handle + signed httpOnly cookie | no passwords in a clone demo; the cookie identifies the owner of every row |
| icons | lucide-react (MIT) | open icon set, never the target's icons |
| camera | getUserMedia with a generated fallback scene | real camera where the browser grants it, a designed scene otherwise |

One origin: Vite serves the app on host port 3000 and proxies `/api` to the API
on 4000, so cookies are first-party and no CORS is needed.

## Schema

`replica/schema.sql`: users, tags, sessions, kudos, comments, nudges,
friendships. Every row a user owns carries `user_id`; every read filters by the
signed-in user or their friends. Times are `timestamptz` in UTC; durations are
integer seconds.

Hard constraints:

- `sessions.duration_seconds > 0` and `ended_at > started_at`.
- `unique (user_id, name)` on tags.
- One kudos per user per session (`primary key (session_id, user_id)`).
- Comments cascade with their session; sessions cascade with their user.

## API

| method path | does | who | input | output |
| --- | --- | --- | --- | --- |
| GET `/api/me` | current user + today | anyone | n/a | user, todaySeconds, streak |
| POST `/api/auth/start` | claim a handle and sign in | anyone | handle, displayName | user |
| POST `/api/auth/logout` | clear the cookie | signed in | n/a | ok |
| GET `/api/tags` | my tags | signed in | n/a | tags |
| GET `/api/home` | record screen bootstrap | signed in | n/a | me, tags, todaySeconds, streak, friendsLive |
| POST `/api/sessions` | save a finished session | signed in | startedAt, endedAt, durationSeconds, mode, cameraOn, tagName, visibility | session, streak, todaySeconds |
| GET `/api/sessions` | my sessions | signed in | limit | sessions with tag |
| DELETE `/api/sessions/:id` | remove one of mine | owner | n/a | ok |
| GET `/api/stats` | proof screen | signed in | n/a | totals, streak, heatmap, week, trend, recent |
| GET `/api/feed` | friends' shared sessions | signed in | n/a | posts with kudos, comments |
| POST `/api/sessions/:id/kudos` | toggle kudos | signed in | n/a | liked, count |
| POST `/api/sessions/:id/comments` | comment | signed in | body | comment |
| GET `/api/group` | leaderboard + live | signed in | n/a | rows, live |
| POST `/api/nudges` | nudge a friend | signed in | toUserId | ok |

## Parts that bite

- **Time**: store UTC, render local; day keys computed in SQL with the server
  timezone (UTC) so streaks and the heatmap agree.
- **Pause semantics**: only running time counts; hidden tab pauses; paused time
  never enters `duration_seconds`.
- **Streak**: distinct days, consecutive ending today or yesterday; a gap
  resets it.
- **Idempotency**: saving is a single insert with a client-generated draft id;
  double submit is prevented in the client and harmless server-side.
- **Auth**: every mutation scopes by `user_id` from the signed cookie; session
  ids are never trusted from the body.

## Build order

1. Vertical slice: claim a handle → record → stop → tag → save → profile
   numbers move.
2. Must-haves by area: capture, timers, proof, gallery, feed, group.
3. Should/could: editor surface, nudge, share sheet, trend badges.
4. Rebrand and deploy are separate skills; this branch is the working clone.
