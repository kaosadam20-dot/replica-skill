# Recon map: Latent (Android clone)

Target: **Latent: Focus Timelapse** (iOS, Weaive Inc.). No Android build exists,
so this clone targets the Android form factor first: a single-column phone app,
Material-style system bars, one-handed controls at the bottom.

Sources read: public App Store listing and its feature list, the public
marketing page copy as supplied by the user (three screenshots: marketing,
camera / profile / feed, and study group / gallery / editor), and the public
review excerpts on the listing. No account was used, no bundle or private
endpoint was read.

## Core loop

Press record → a timelapse of you working is filmed while the app is open →
stop → the session becomes a duration with a tag → duration feeds a streak and
a heatmap → the session can be shared to a feed where friends give kudos.

## Screen inventory

| ID | screen | route | purpose | key components | states |
| --- | --- | --- | --- | --- | --- |
| S01 | Onboarding / sign in | `/login` | claim a handle, enter the app | wordmark, handle input, primary CTA, demo entry | default, invalid handle, submitting |
| S02 | Focus camera home | `/` | start a session | camera feed, timer, speed pill, timer-mode button, record button, camera toggle, bottom nav | camera on / camera off, idle, returning-from-save |
| S03 | Active session | `/session` | film while working | full-bleed feed, elapsed timer, pause / stop, blocked-apps and screen-off chips, paused overlay with 15:00 resume countdown | running, paused, paused-expired, camera off |
| S04 | Save session | `/save` | turn the clip into a number | duration, tag picker, new tag, visibility toggle, save / discard | saving, error, new tag |
| S05 | Feed | `/feed` | see friends' effort | post cards (feed, duration, time range, tag), kudos, comments, empty | loading, filled, empty |
| S06 | Profile / proof | `/profile` | see your own evidence | avatar header, friends / all time / longest, filter tabs, metric grid, heatmap + trend badge, 7-day bars, recent sessions, sign out | filled, empty, filter applied |
| S07 | Gallery | `/gallery` | every session, saved | 3-column clip grid with duration overlays, totals header | filled, empty |
| S08 | Session editor | `/editor/:id` | make the clip yours | full-bleed clip, overlay stats, tabs (Stickers, Timers, Trim, Speed), share sheet | each tab, share open, deleted |
| S09 | Study group | `/group` | lock in together | live-now row, nudge card, trend chart, weekly leaderboard | filled, nudged |
| S10 | App shell | n/a | navigation | bottom nav (home, camera, profile), safe areas | n/a |

## Flows

```
F01 Start and finish a focus session
    S02 press record -> S03 timer runs -> stop -> S04 tag + visibility -> save
    -> S02 with streak confirmation -> S06 shows the new number
    edge: pause longer than the resume window, camera denied, camera-off mode,
          goal timer reaching zero, tab hidden (recording pauses)

F02 Review your proof
    S06 profile -> filter tabs -> heatmap day -> S07 gallery -> S08 editor
    edge: no sessions yet, a single session, 100+ sessions

F03 Share effort with friends
    S05 feed -> kudos -> comment -> S09 group -> nudge a friend who has not logged
    edge: empty feed, your own post, a comment with no body

F04 Make a session yours
    S07 gallery -> S08 editor -> stickers / timers / trim / speed -> share sheet
    edge: no clip (camera-off session), very long session, delete session

F05 Claim a handle
    S01 handle -> S02
    edge: handle taken, handle with spaces, empty handle
```

## Components

`CameraFeed` (live camera or simulated desk scene, recording badge, timestamp,
grain, vignette), `TimerDisplay`, `TimerRing` (goal / pomodoro), `RecordButton`,
`ControlBar`, `Chip`, `BottomNav`, `Sheet`, `TagPicker`, `SessionCard`,
`Avatar`, `Heatmap`, `BarChart`, `Sparkline`, `LeaderboardRow`, `StatBlock`,
`EmptyState`, `Toast`.

## Inferred data model

```
User      id, handle, display_name, avatar_hue, bio, live_since        high
Tag       id, user_id, name, color                                    high (tag chips in feed + editor)
Session   id, user_id, tag_id, started_at, ended_at, duration_seconds,
          mode (stopwatch | goal | pomodoro), camera_on,
          visibility (private | friends)                              high
Kudos     session_id, user_id                                         high (heart + count)
Comment   id, session_id, user_id, body                               high (comment count)
Nudge     id, from_user_id, to_user_id, created_at                    medium (nudge card)
Friendship user_id, friend_id                                         medium (friend list, feed scope)
```

Video files themselves are not modelled: the clone simulates capture, keeps the
session record, and renders a generated clip surface in the editor.

## Feature matrix

See `replica/features.csv`.

## Cannot be cloned (skip rows)

- The friends network and its users: you get your own empty social graph plus demo friends.
- Cloud transcoding / real timelapse encoding of camera footage: out of scope; capture is simulated, duration is real.
- App blocking / OS notification suppression: needs Android platform APIs, out of scope for the preview build.
- The original's brand, copy, icons and marketing assets: replaced with original words and open icons.

## Size

10 screens, 5 flows, 6 tables. Hard parts: the recording state machine
(pause, goal/pomodoro phases, hidden-tab behaviour), the heatmap/streak maths,
and the editor surface. Size: **M** for a core-loop clone; the social graph and
real video encoding are what would make it L.
