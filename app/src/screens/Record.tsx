import { BellOff, Check, Flame, MoonStar, Timer, Video, VideoOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraFeed } from '../components/CameraFeed'
import { Sheet } from '../components/Sheet'
import { StatusBar } from '../components/StatusBar'
import { api } from '../lib/api'
import { formatClock } from '../lib/format'
import { useAuth } from '../state/AuthContext'

type Mode = 'stopwatch' | 'goal' | 'pomodoro'

const MODES: { key: Mode; title: string; description: string }[] = [
  { key: 'stopwatch', title: 'Stopwatch', description: 'Count up until you decide you are done.' },
  { key: 'goal', title: 'Goal timer', description: 'Count down from a target and stop on its own.' },
  { key: 'pomodoro', title: 'Pomodoro', description: 'Four focus rounds of 25 with 5 minute breaks.' },
]

const GOALS = [15, 25, 50, 90]

export function Record() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [todaySeconds, setTodaySeconds] = useState(0)
  const [streak, setStreak] = useState(0)
  const [cameraOn, setCameraOn] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [mode, setMode] = useState<Mode>('stopwatch')
  const [goalMinutes, setGoalMinutes] = useState(25)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    api
      .home()
      .then((data) => {
        setTodaySeconds(data.todaySeconds)
        setStreak(data.streak)
      })
      .catch(() => undefined)
  }, [])

  const start = () => {
    navigate(`/session?mode=${mode}&goal=${goalMinutes}&camera=${cameraOn ? 1 : 0}`)
  }

  const modeLabel =
    mode === 'stopwatch' ? 'Stopwatch' : mode === 'goal' ? `Goal · ${goalMinutes} min` : 'Pomodoro · 25/5'

  return (
    <div className="record">
      {cameraOn ? <CameraFeed live tone={34} timestamp /> : <div className="scene scene--off" aria-hidden="true" />}
      <StatusBar overlay />

      <div className="record__head">
        <span className="wordmark">latent</span>
        <span className="streak-pill">
          <Flame size={13} color="var(--accent)" />
          <strong>{streak}</strong> day streak
        </span>
      </div>

      <div className="record__timer">
        <div className="eyebrow">Today</div>
        <div className={`timer-big ${todaySeconds === 0 ? 'timer-big--muted' : ''}`}>
          {formatClock(todaySeconds)}
        </div>
        <div className="record__hint">
          {todaySeconds === 0
            ? `Press record and get to work, ${user?.display_name.split(' ')[0] ?? 'friend'}.`
            : 'Every minute here counts twice: once now, once when you look back.'}
        </div>
      </div>

      <div className="record__chips">
        <span className="chip">
          <BellOff size={12} /> Notifications off
        </span>
        <span className="chip">
          <MoonStar size={12} /> {modeLabel}
        </span>
      </div>

      <div className="control-bar">
        <button
          className="speed-pill"
          onClick={() => setSpeed((current) => (current === 1 ? 2 : current === 2 ? 4 : 1))}
          aria-label={`Playback speed ${speed}x`}
        >
          {speed.toFixed(1)}x
        </button>
        <button className="control" onClick={() => setSheetOpen(true)} aria-label="Choose a timer">
          <Timer size={18} />
        </button>
        <button className="record-btn" onClick={start} aria-label="Start recording">
          <span className="record-btn__dot" />
        </button>
        <button
          className={`control ${cameraOn ? '' : 'control--off'}`}
          onClick={() => setCameraOn((current) => !current)}
          aria-label={cameraOn ? 'Turn the camera off' : 'Turn the camera on'}
        >
          {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="How long are we going?" subtitle="Pick the shape of this session">
        <div className="mode-list">
          {MODES.map((option) => (
            <button
              key={option.key}
              className={`mode-option ${mode === option.key ? 'mode-option--on' : ''}`}
              onClick={() => {
                setMode(option.key)
                if (option.key === 'stopwatch') setSheetOpen(false)
              }}
              aria-pressed={mode === option.key}
            >
              <span className="mode-option__icon">
                <Timer size={17} />
              </span>
              <span className="mode-option__text">
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </span>
              {mode === option.key ? <Check size={16} color="var(--accent)" /> : null}
            </button>
          ))}
        </div>

        {mode === 'goal' ? (
          <div style={{ marginTop: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Target
            </div>
            <div className="tag-list">
              {GOALS.map((minutes) => (
                <button
                  key={minutes}
                  className={`tag ${goalMinutes === minutes ? 'tag--on' : ''}`}
                  onClick={() => setGoalMinutes(minutes)}
                >
                  {minutes} min
                </button>
              ))}
            </div>
            <button className="btn btn--primary" style={{ marginTop: 16 }} onClick={() => setSheetOpen(false)}>
              Use this timer
            </button>
          </div>
        ) : null}

        {mode === 'pomodoro' ? (
          <button className="btn btn--primary" style={{ marginTop: 16 }} onClick={() => setSheetOpen(false)}>
            Use pomodoro
          </button>
        ) : null}
      </Sheet>
    </div>
  )
}
