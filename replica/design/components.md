# Components: Latent Android clone

Built from the recon component list. Every value comes from
`replica/design/tokens.json`; no raw hex in components. Icons are Lucide (MIT).

## CameraFeed

- Renders the capture surface: a real `getUserMedia` video when the browser
  grants a camera, otherwise a generated desk scene (window light, lamp glow,
  laptop screen, silhouette, grain, vignette, slow scan line).
- Props: `live`, `tone` (scene hue, derived from the session id so every clip
  looks different), `timestamp`.
- States: camera on, camera off (the parent swaps in `scene--off`: no feed,
  just the clock), live video, generated scene.
- Used on S02, S03, S05, S07, S08.

## TimerDisplay

- `formatClock` for stopwatch, `formatCountdown` for goal and pomodoro.
- Tabular numerals, weight 300 at 46px, white on the scene with a soft shadow.
- Modes: stopwatch (counts up), goal (counts down, auto-ends), pomodoro (focus
  / break phases, four rounds, break time is not counted).

## ControlBar (S02)

- Speed pill (1.0x / 2.0x / 4.0x, cycles), timer-mode button, record button,
  camera toggle.
- Record: 62px accent circle, inner dark rounded square, 5px accent halo.
- Disabled/off states: camera toggle dims when the camera is off.

## Sheet

- Bottom sheet over a blurred scrim, 28px top radius, grab handle, title and
  close control, dismiss on scrim click.
- Used for the timer picker, profile menu, share sheet, delete confirm.

## SessionCard (S05)

- Header: avatar, name, `@handle · relative time`, tag pill.
- Media: 4:4.4 generated clip with duration and time-range badges.
- Actions: kudos (heart, filled when mine), comment (focuses the input).
- Kudos line ("Kudos from A and 3 others"), comments, inline comment form.
- Empty state handled by the feed, not the card.

## Heatmap (S06)

- 17 columns × 7 rows (119 days), 3px gap, 2.5px radius cells.
- Five levels: none, <30m, <1h, <2h, 2h+.
- Accessible: `role="img"` with a label, per-cell `title` for the date and
  minutes; a "less → more" legend sits under it.

## WeekBars (S06)

- Seven bars, height relative to the week's maximum, weekday initials below.

## TrendChart (S09)

- Three-line SVG of cumulative daily minutes for the top three people, strokes
  keyed to each avatar hue, legend below.

## LeaderboardRow (S09)

- Rank, avatar, name (with "(you)"), weekly time, progress bar relative to the
  leader.

## TagPicker (S04)

- Preset tags from the user's own list plus a free-text new tag (32 chars).
- Selected state: accent border, accent-soft fill, accent dot.

## Buttons

- Primary: accent fill, on-accent ink, 50px, pill.
- Ghost: 5% white fill, border, 50px, pill.
- Danger: danger tint at 10% with a danger border.
- Focus: 2px accent ring at 2px offset on every interactive element.
- Loading: label changes ("Saving…") and the control is disabled.

## Empty states

- Icon, short title, one sentence, one action. Never a bare "no data".
