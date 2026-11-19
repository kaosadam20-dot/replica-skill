import { Camera, Clock, Ghost, Image as ImageIcon, MessageCircle, Music2, Share2, Timer, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CameraFeed } from '../components/CameraFeed'
import { Sheet } from '../components/Sheet'
import { StatusBar } from '../components/StatusBar'
import { api } from '../lib/api'
import { dayLabel, formatShort, sceneTone, timeRange } from '../lib/format'
import type { Session } from '../lib/types'
import { useToast } from '../state/ToastContext'

const STICKERS = ['Stats', 'Minimal', 'Streak', 'Tag']
const TIMERS = ['None', 'Timer', 'Stopwatch', 'Clock', 'Ring']
const SHARE_TARGETS = [
  { label: 'Instagram', icon: Camera },
  { label: 'TikTok', icon: Music2 },
  { label: 'Snapchat', icon: Ghost },
  { label: 'Messages', icon: MessageCircle },
  { label: 'Photos', icon: ImageIcon },
]

type Tab = 'stickers' | 'timers' | 'trim' | 'speed'

export function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show } = useToast()
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [tab, setTab] = useState<Tab>('stickers')
  const [sticker, setSticker] = useState('Stats')
  const [timerStyle, setTimerStyle] = useState('None')
  const [trim, setTrim] = useState(100)
  const [speed, setSpeed] = useState(1)
  const [shareOpen, setShareOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    api
      .sessions(200)
      .then((data) => setSessions(data.sessions))
      .catch(() => setSessions([]))
  }, [])

  const session = sessions?.find((entry) => entry.id === id)

  const remove = async () => {
    if (!session) return
    try {
      await api.deleteSession(session.id)
      show('Session deleted')
      navigate('/gallery', { replace: true })
    } catch (caught) {
      show((caught as Error).message)
    }
  }

  if (sessions === null) {
    return <div className="loading">Opening the clip…</div>
  }

  if (!session) {
    return (
      <div className="screen screen--pad">
        <StatusBar />
        <div className="empty">
          <strong>That session is gone</strong>
          <span>It may have been deleted. Your other clips are in the gallery.</span>
          <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={() => navigate('/gallery')}>
            Back to gallery
          </button>
        </div>
      </div>
    )
  }

  const duration = formatShort(session.duration_seconds)

  return (
    <div className="editor">
      <div className="editor__stage">
        <CameraFeed tone={sceneTone(session.id)} />
        <StatusBar overlay />

        <div
          style={{
            position: 'absolute',
            top: 46,
            left: 12,
            right: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 5,
          }}
        >
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
            <X size={18} />
          </button>
          <span className="chip">Editing</span>
        </div>

        <div className="editor__overlay" style={{ paddingTop: 96 }}>
          <div />
          <div className="editor__stats">
            {sticker === 'Tag' && session.tag_name ? (
              <div className="editor__tag" style={{ fontSize: 15 }}>
                {session.tag_name}
              </div>
            ) : null}
            <div className="editor__duration">{duration}</div>
            {sticker !== 'Minimal' && session.tag_name ? <div className="editor__tag">{session.tag_name}</div> : null}
            {sticker === 'Stats' ? (
              <div className="editor__date">
                {dayLabel(session.started_at)} · {timeRange(session.started_at, session.ended_at)}
              </div>
            ) : null}
            {sticker === 'Streak' ? <div className="editor__date">Streak kept · {dayLabel(session.started_at)}</div> : null}
            {timerStyle !== 'None' ? (
              <div style={{ marginTop: 8 }}>
                <span className="tag-pill">
                  <Timer size={11} /> {timerStyle} · {duration}
                </span>
              </div>
            ) : null}
            <div className="editor__brand" style={{ marginTop: 10 }}>
              latent
            </div>
          </div>
        </div>
      </div>

      <div className="editor__panel">
        <div className="editor__tabs" role="tablist" aria-label="Editor tools">
          {(['stickers', 'timers', 'trim', 'speed'] as Tab[]).map((entry) => (
            <button key={entry} role="tab" aria-selected={tab === entry} onClick={() => setTab(entry)}>
              {entry[0].toUpperCase() + entry.slice(1)}
            </button>
          ))}
        </div>

        <div className="editor__body">
          {tab === 'stickers' ? (
            <div className="sticker-grid">
              {STICKERS.map((option) => (
                <button
                  key={option}
                  className={`sticker ${sticker === option ? 'sticker--on' : ''}`}
                  onClick={() => setSticker(option)}
                  aria-pressed={sticker === option}
                >
                  {option === 'Stats' ? <Clock size={16} /> : null}
                  {option}
                </button>
              ))}
            </div>
          ) : null}

          {tab === 'timers' ? (
            <div className="timer-grid">
              {TIMERS.map((option) => (
                <button
                  key={option}
                  className={`timer-option ${timerStyle === option ? 'timer-option--on' : ''}`}
                  onClick={() => setTimerStyle(option)}
                  aria-pressed={timerStyle === option}
                >
                  {option}
                  <span>{option === 'None' ? 'no overlay' : duration}</span>
                </button>
              ))}
            </div>
          ) : null}

          {tab === 'trim' ? (
            <div>
              <div className="spread" style={{ marginBottom: 10 }}>
                <span className="eyebrow">Keep the best part</span>
                <span className="dim" style={{ fontSize: 11 }}>
                  {trim}%
                </span>
              </div>
              <input
                className="slider"
                type="range"
                min={10}
                max={100}
                value={trim}
                onChange={(event) => setTrim(Number(event.target.value))}
                aria-label="Trim length"
              />
              <p className="dim" style={{ fontSize: 11, marginTop: 10 }}>
                {duration} of footage, condensed for the share.
              </p>
            </div>
          ) : null}

          {tab === 'speed' ? (
            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Playback
              </div>
              <div className="speed-row">
                {[1, 2, 4].map((option) => (
                  <button
                    key={option}
                    className={`tag ${speed === option ? 'tag--on' : ''}`}
                    onClick={() => setSpeed(option)}
                    aria-pressed={speed === option}
                  >
                    {option.toFixed(1)}x
                  </button>
                ))}
              </div>
              <p className="dim" style={{ fontSize: 11, marginTop: 12 }}>
                A three hour session lands at about {formatShort(Math.round((session.duration_seconds / speed) * 0.06))} of
                film.
              </p>
            </div>
          ) : null}
        </div>

        <div style={{ padding: '0 16px 8px' }}>
          <button className="btn btn--primary" onClick={() => setShareOpen(true)}>
            <Share2 size={16} /> Share this session
          </button>
        </div>
      </div>

      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="Share to" subtitle={duration}>
        {confirmDelete ? (
          <div className="stack" style={{ gap: 10 }}>
            <p className="muted" style={{ fontSize: 13 }}>
              Delete this session for good? The number leaves your totals too.
            </p>
            <button className="btn btn--danger" onClick={remove}>
              <Trash2 size={15} /> Yes, delete it
            </button>
            <button className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
          </div>
        ) : (
          <>
            <div className="share-grid">
              {SHARE_TARGETS.map((target) => (
                <button
                  key={target.label}
                  className="share-target"
                  onClick={() => {
                    setShareOpen(false)
                    show(`Shared to ${target.label}`)
                  }}
                >
                  <i>
                    <target.icon size={20} />
                  </i>
                  {target.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setShareOpen(false)
                  show('Download started')
                }}
              >
                Download
              </button>
              <button className="btn btn--danger btn--sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  )
}
