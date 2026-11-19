import { ArrowLeft, Camera } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraFeed } from '../components/CameraFeed'
import { StatusBar } from '../components/StatusBar'
import { api } from '../lib/api'
import { formatShort, formatTotal, sceneTone } from '../lib/format'
import type { Session } from '../lib/types'

export function Gallery() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[] | null>(null)

  useEffect(() => {
    api
      .sessions()
      .then((data) => setSessions(data.sessions))
      .catch(() => setSessions([]))
  }, [])

  const total = (sessions ?? []).reduce((sum, session) => sum + session.duration_seconds, 0)

  return (
    <div className="screen">
      <StatusBar />
      <div className="page-head">
        <div>
          <div className="page-title">Gallery</div>
          <div className="page-sub">
            {sessions ? `${sessions.length} sessions · ${formatTotal(total)}` : 'Loading your clips…'}
          </div>
        </div>
        <button className="icon-btn" onClick={() => navigate('/profile')} aria-label="Back to profile">
          <ArrowLeft size={18} />
        </button>
      </div>

      {sessions === null ? (
        <div className="gallery-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton" style={{ aspectRatio: '3 / 4' }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="empty">
          <Camera size={22} />
          <strong>No sessions saved yet</strong>
          <span>Every session keeps its clip. Record one and it lands here.</span>
          <button className="btn btn--primary" style={{ marginTop: 12, maxWidth: 200 }} onClick={() => navigate('/')}>
            Record a session
          </button>
        </div>
      ) : (
        <div className="gallery-grid">
          {sessions.map((session) => (
            <button
              key={session.id}
              className="gallery-tile"
              onClick={() => navigate(`/editor/${session.id}`)}
              aria-label={`${session.tag_name ?? 'Session'}, ${formatShort(session.duration_seconds)}`}
            >
              <CameraFeed tone={sceneTone(session.id)} />
              <span className="gallery-tile__badge">{formatShort(session.duration_seconds)}</span>
              {session.tag_color ? (
                <span className="gallery-tile__tag" style={{ background: session.tag_color }} />
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
