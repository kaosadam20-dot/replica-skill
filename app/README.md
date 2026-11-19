# Latent: Android clone (working build)

An Android-first rebuild of the Latent focus camera: press record, work, and
the session becomes a duration, a streak and a clip you can share.

- Mobile web app (Vite + React + TypeScript), single column, phone frame on
  desktop, full-bleed on a phone.
- Express API + Postgres. Schema and demo seed run on first boot.
- Simulated capture: a generated desk scene stands in for the camera, and a
  real camera is used when the browser grants one. Durations are real.

## Run

```bash
cd app
npm install
DATABASE_URL=postgres://latent:latent_local_dev@localhost:5432/latent npm run dev
```

The sandbox environment runs this through Docker Compose; see the environment
setup notes for the services, ports and reset steps.

## Layout

```
app/
  server/    Express API, schema.sql, demo seed
  src/
    screens/ Record, ActiveSession, SaveSession, Feed, Profile, Gallery, Editor, Group, Login
    components/ CameraFeed, Heatmap, WeekBars, TrendChart, SessionCard, Sheet, ...
    lib/     api client, formatters, types
    styles/  tokens.css, app.css
```

## Flows

1. Claim a handle (or continue as the demo account).
2. Record: stopwatch, goal timer or pomodoro; camera on or off; pause keeps a
   15 minute resume window.
3. Save: duration, tag, private or friends.
4. See it land: today's total, streak, heatmap, gallery, feed.
5. Share: kudos and comments on shared sessions, nudges and a weekly
   leaderboard in the study group.
