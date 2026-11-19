import { BellOff, Pause, Play, Square, Video, VideoOff } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CameraFeed } from '../components/CameraFeed'
import { StatusBar } from '../components/StatusBar'
import { formatClock, formatCountdown } from '../lib/format'

const PAUSE_WINDOW = 15 * 60

export function ActiveSession() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const mode = (params.get('mode') ?? 'stopwatch') as 'stopwatch' | 'goal' | 'pomodoro'
  const goalMinutes = Math.max(1, Number(params.get('goal') ?? 25))

  const [cameraOn, setCameraOn] = useState(params.get('camera') !== '0')
  const [paused, setPaused] = useState(false)
  const [, forceRender] = useState(0)

  const elapsedRef = useRef(0)
  const remainingRef = useRef(goalMinutes * 60)
  const phaseRef = useRef<'focus' | 'break'>('focus')
  const roundRef = useRef(1)
  const pauseLeftRef = useRef(PAUSE_WINDOW)
  const pausedRef = useRef(false)
  const startedAtRef = useRef(new Date())
  const finishedRef = useRef(false)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    const duration = Math.max(1, Math.round(elapsedRef.current))
    const ended = new Date()
    const query = new URLSearchParams({
      duration: String(duration),
      started: startedAtRef.current.toISOString(),
      ended: ended.toISOString(),
      mode,
      camera: cameraOn ? '1' : '0',
    })
    navigate(`/save?${query.toString()}`, { replace: true })
  }, [navigate, mode, cameraOn])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (finishedRef.current) return

      if (pausedRef.current) {
        pauseLeftRef.current -= 1
        if (pauseLeftRef.current <= 0) {
          finish()
          return
        }
      } else if (phaseRef.current === 'focus') {
        elapsedRef.current += 1
        if (mode !== 'stopwatch') {
          remainingRef.current -= 1
          if (remainingRef.current <= 0) {
            if (mode === 'goal') {
              finish()
              return
            }
            if (roundRef.current >= 4) {
              finish()
              return
            }
            phaseRef.current = 'break'
            remainingRef.current = 5 * 60
          }
        }
      } else {
        remainingRef.current -= 1
        if (remainingRef.current <= 0) {
          phaseRef.current = 'focus'
          roundRef.current += 1
          remainingRef.current = goalMinutes * 60
        }
      }

      forceRender((value) => value + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [finish, mode, goalMinutes])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && !pausedRef.current && !finishedRef.current) {
        pausedRef.current = true
        pauseLeftRef.current = PAUSE_WINDOW
        setPaused(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const pause = () => {
    pausedRef.current = true
    pauseLeftRef.current = PAUSE_WINDOW
    setPaused(true)
  }

  const resume = () => {
    pausedRef.current = false
    setPaused(false)
    forceRender((value) => value + 1)
  }

  const inBreak = mode === 'pomodoro' && phaseRef.current === 'break'
  const display = mode === 'stopwatch' ? formatClock(elapsedRef.current) : formatCountdown(remainingRef.current)
  const progress =
    mode === 'stopwatch'
      ? 0
      : Math.min(100, Math.max(0, 100 - (remainingRef.current / (inBreak ? 5 * 60 : goalMinutes * 60)) * 100))

  const phaseLabel =
    mode === 'stopwatch'
      ? 'Stopwatch'
      : mode === 'goal'
        ? `Goal · ${goalMinutes} minutes`
        : inBreak
          ? 'Break · breathe'
          : `Focus · round ${roundRef.current} of 4`

  return (
    <div className="session-screen">
      {cameraOn ? (
        <CameraFeed live tone={inBreak ? 200 : 34} />
      ) : (
        <div className="scene scene--off" aria-hidden="true" />
      )}

      <StatusBar overlay />

      <div className="session-top">
        <div className="rec-indicator">
          <i className="rec-dot" /> {cameraOn ? 'Recording' : 'Timer only'}
        </div>
        <div className="session-timer">{display}</div>
        <div className="eyebrow">{phaseLabel}</div>
      </div>

      {mode !== 'stopwatch' ? (
        <div className="session-progress" aria-hidden="true">
          <i style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      <div className="record__chips">
        <span className="chip">
          <BellOff size={12} /> Notifications off
        </span>
        <span className="chip">
          {cameraOn ? <Video size={12} /> : <VideoOff size={12} />} {cameraOn ? 'Camera on' : 'Camera off'}
        </span>
      </div>

      <div className="session-controls">
        <button className="round-btn" onClick={pause} aria-label="Pause recording">
          <Pause size={22} />
        </button>
        <button className="round-btn round-btn--stop" onClick={finish} aria-label="End session">
          <Square size={20} fill="currentColor" />
        </button>
        <button
          className="round-btn"
          onClick={() => setCameraOn((current) => !current)}
          aria-label={cameraOn ? 'Turn the camera off' : 'Turn the camera on'}
        >
          {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
      </div>

      {paused ? (
        <div className="paused-overlay">
          <div className="eyebrow">Recording paused</div>
          <h2>Resume before the clock runs out.</h2>
          <div className="paused-count">{formatCountdown(pauseLeftRef.current)}</div>
          <p className="muted" style={{ fontSize: 12, maxWidth: 26 + 'ch' }}>
            Leaving the app stops the film. You have fifteen minutes to come back before the session ends.
          </p>
          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 280 }}>
            <button className="btn btn--primary" onClick={resume}>
              <Play size={16} /> Resume
            </button>
            <button className="btn btn--ghost" onClick={finish}>
              End
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
