# Build log: Latent Android clone

Order: shell → vertical slice → screens → states.

| ID | screen | status | notes |
| --- | --- | --- | --- |
| S01 | Onboarding / sign in | done | handle claim + demo entry, invalid-handle error |
| S02 | Focus camera home | done | generated scene, today total, streak, speed, timer sheet, camera toggle |
| S03 | Active session | done | stopwatch / goal / pomodoro, pause with 15:00 resume window, hidden tab pauses |
| S04 | Save session | done | duration, tag presets + new tag, private/friends, discard |
| S05 | Feed | done | cards, kudos, comments, empty state |
| S06 | Profile / proof | done | totals, streak, filters, 119-day heatmap, trend badge, 7-day bars, recent |
| S07 | Gallery | done | 3-column grid, duration overlays, tag dots |
| S08 | Session editor | partial | stickers / timers / trim / speed are presentational; share sheet and delete are real |
| S09 | Study group | done | live now, nudge, trend chart, weekly leaderboard |
| S10 | App shell | done | status bar, 4-item bottom nav, phone frame on desktop |

## What was harder than it looked

- **Flex column squeeze.** Feed cards collapsed to thin bars because 20 cards
  in a scrolling flex column shrank to fit. Fixed with `flex: 0 0 auto` on the
  scroll container's children.
- **Camera-off mode.** The generated scene made camera-off look identical to
  camera-on. Camera-off now renders a dedicated clock-only surface, matching
  the "no camera, just the clock" promise.
- **Pomodoro.** Break time must not count toward the session, so elapsed and
  remaining are tracked separately from the phase.
- **Real video.** Timelapse encoding and cloud clips are out of scope; the
  clone keeps the real session record and renders a generated clip surface.
