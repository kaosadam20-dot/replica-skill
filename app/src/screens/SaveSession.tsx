import { Lock, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CameraFeed } from '../components/CameraFeed'
import { StatusBar } from '../components/StatusBar'
import { api } from '../lib/api'
import { formatShort, timeRange } from '../lib/format'
import type { Tag } from '../lib/types'
import { useToast } from '../state/ToastContext'

export function SaveSession() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { show } = useToast()

  const duration = Math.max(0, Math.round(Number(params.get('duration') ?? 0)))
  const endedAt = params.get('ended') ?? new Date().toISOString()
  const startedAt = params.get('started') ?? new Date(Date.now() - duration * 1000).toISOString()
  const mode = params.get('mode') ?? 'stopwatch'
  const cameraOn = params.get('camera') !== '0'

  const [tags, setTags] = useState<Tag[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [customTag, setCustomTag] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'friends'>('private')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .tags()
      .then((data) => {
        setTags(data.tags)
        setSelected(data.tags[0]?.name ?? null)
      })
      .catch(() => undefined)
  }, [])

  const save = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = await api.saveSession({
        startedAt,
        endedAt,
        durationSeconds: Math.max(1, duration),
        mode,
        cameraOn,
        tagName: customTag.trim() || selected || '',
        visibility,
      })
      show(`Saved · ${formatShort(duration)} · ${result.streak} day streak`)
      navigate('/', { replace: true })
    } catch (caught) {
      setError((caught as Error).message)
      setBusy(false)
    }
  }

  if (duration < 1) {
    return (
      <div className="screen screen--pad">
        <StatusBar />
        <div className="empty">
          <strong>Nothing to save yet</strong>
          <span>That session was too short to count. Go again and give it a minute.</span>
          <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={() => navigate('/')}>
            Back to the camera
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <StatusBar />
      <div className="page-head">
        <div>
          <div className="page-title" style={{ fontSize: 22 }}>
            Session complete
          </div>
          <div className="page-sub">Turn it into a number.</div>
        </div>
        <button className="icon-btn" onClick={() => navigate('/', { replace: true })} aria-label="Discard session">
          <X size={18} />
        </button>
      </div>

      <div className="save-screen">
        <div className="save-preview">
          {cameraOn ? <CameraFeed tone={34} /> : <div className="scene scene--off" aria-hidden="true" />}
          <div className="save-preview__stats">
            <div>
              <div className="save-duration">{formatShort(duration)}</div>
              <div className="page-sub" style={{ color: 'rgba(244,242,238,.62)' }}>
                {timeRange(startedAt, endedAt)}
              </div>
            </div>
            <span className="tag-pill">
              {mode === 'stopwatch' ? 'Stopwatch' : mode === 'goal' ? 'Goal' : 'Pomodoro'}
              {cameraOn ? '' : ' · no camera'}
            </span>
          </div>
        </div>

        <div>
          <div className="spread" style={{ marginBottom: 9 }}>
            <span className="eyebrow">Tag this session</span>
            <span className="dim" style={{ fontSize: 11 }}>
              optional
            </span>
          </div>
          <div className="tag-list">
            {tags.map((tag) => (
              <button
                key={tag.id}
                className={`tag ${selected === tag.name && !customTag ? 'tag--on' : ''}`}
                onClick={() => {
                  setSelected(tag.name)
                  setCustomTag('')
                }}
              >
                <i className="tag-dot" style={{ background: tag.color }} />
                {tag.name}
              </button>
            ))}
          </div>
          <input
            className="input"
            style={{ marginTop: 10, height: 44 }}
            placeholder="Or name a new one"
            value={customTag}
            onChange={(event) => setCustomTag(event.target.value)}
            maxLength={32}
            aria-label="New tag name"
          />
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 9 }}>
            Who can see it
          </div>
          <div className="visibility-toggle">
            <button aria-pressed={visibility === 'private'} onClick={() => setVisibility('private')}>
              <Lock size={14} /> Only me
            </button>
            <button aria-pressed={visibility === 'friends'} onClick={() => setVisibility('friends')}>
              <Users size={14} /> Friends
            </button>
          </div>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <div className="stack" style={{ gap: 10 }}>
          <button className="btn btn--primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Keep this session'}
          </button>
          <button className="btn btn--ghost" onClick={() => navigate('/', { replace: true })}>
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}
