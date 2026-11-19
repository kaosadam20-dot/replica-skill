import { ChevronDown, Flame, Images, Share2, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { CameraFeed } from '../components/CameraFeed'
import { Heatmap, HeatmapLegend } from '../components/Heatmap'
import { Sheet } from '../components/Sheet'
import { StatusBar } from '../components/StatusBar'
import { WeekBars } from '../components/WeekBars'
import { api } from '../lib/api'
import { dayLabel, formatShort, formatTotal, sceneTone, timeRange } from '../lib/format'
import type { Proof } from '../lib/types'
import { useAuth } from '../state/AuthContext'
import { useToast } from '../state/ToastContext'

export function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { show } = useToast()
  const [proof, setProof] = useState<Proof | null>(null)
  const [friends, setFriends] = useState<number | null>(null)
  const [filter, setFilter] = useState('All')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    Promise.all([api.stats(), api.group()])
      .then(([stats, group]) => {
        setProof(stats)
        setFriends(Math.max(0, group.leaderboard.length - 1))
      })
      .catch(() => undefined)
  }, [])

  const tabs = useMemo(() => {
    const names = Array.from(new Set((proof?.recent ?? []).map((session) => session.tag_name).filter(Boolean)))
    return ['All', ...(names as string[])].slice(0, 4)
  }, [proof])

  const recent = (proof?.recent ?? []).filter((session) => filter === 'All' || session.tag_name === filter)

  const share = async () => {
    const link = `${window.location.origin}/@${user?.handle ?? ''}`
    try {
      await navigator.clipboard.writeText(link)
      show('Profile link copied')
    } catch {
      show(link)
    }
  }

  return (
    <div className="screen">
      <StatusBar />

      <div className="profile-head">
        <div className="spread">
          <div className="row" style={{ gap: 6 }}>
            <span className="profile-handle">@{user?.handle}</span>
            <button
              className="icon-btn"
              style={{ width: 30, height: 30 }}
              onClick={() => setMenuOpen(true)}
              aria-label="Profile menu"
            >
              <ChevronDown size={15} />
            </button>
          </div>
          <button className="icon-btn" onClick={() => navigate('/gallery')} aria-label="Open gallery">
            <Images size={17} />
          </button>
        </div>

        <div className="profile-id">
          <Avatar name={user?.display_name ?? ''} hue={user?.avatar_hue ?? 40} size="lg" />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{user?.display_name}</div>
            <div className="profile-bio">{user?.bio || 'Quietly putting the hours in.'}</div>
          </div>
        </div>

        <div className="stat-row">
          <div className="stat">
            <div className="stat__value">{friends ?? '–'}</div>
            <div className="stat__label">Friends</div>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <div className="stat__value">{proof ? formatTotal(proof.totals.seconds) : '–'}</div>
            <div className="stat__label">All time</div>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <div className="stat__value">{proof ? formatTotal(proof.totals.longest) : '–'}</div>
            <div className="stat__label">Longest</div>
          </div>
        </div>

        <div className="profile-actions">
          <button className="pill-btn" onClick={() => navigate('/gallery')}>
            <Images size={14} /> Gallery
          </button>
          <button className="pill-btn" onClick={share}>
            <Share2 size={14} /> Share
          </button>
          <button className="pill-btn pill-btn--accent" onClick={() => navigate('/group')}>
            <Flame size={14} /> {proof?.streak ?? 0} day streak
          </button>
        </div>
      </div>

      <div className="segmented" role="tablist" aria-label="Filter sessions">
        {tabs.map((tab) => (
          <button key={tab} role="tab" aria-selected={filter === tab} onClick={() => setFilter(tab)}>
            {tab}
          </button>
        ))}
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="metric__label">Sessions</div>
          <div className="metric__value">{proof?.totals.sessions ?? '–'}</div>
        </div>
        <div className="metric">
          <div className="metric__label">Total time</div>
          <div className="metric__value">{proof ? formatTotal(proof.totals.seconds) : '–'}</div>
        </div>
        <div className="metric">
          <div className="metric__label">Daily avg</div>
          <div className="metric__value">{proof ? formatTotal(proof.totals.dailyAverage) : '–'}</div>
        </div>
      </div>

      <div className="proof-card">
        <div className="spread" style={{ marginBottom: 12 }}>
          <span className="eyebrow">Days you showed up</span>
          {proof ? (
            <span className="trend-badge">
              <TrendingUp size={12} /> {proof.trend.percent >= 0 ? '+' : ''}
              {proof.trend.percent}% vs last week
            </span>
          ) : null}
        </div>
        {proof ? <Heatmap days={proof.heatmap} /> : <div className="skeleton" style={{ height: 84 }} />}
        <HeatmapLegend />
        {proof ? <WeekBars week={proof.week} /> : null}
      </div>

      <div className="section-head">
        <h2>Recent</h2>
        <button className="dim" style={{ fontSize: 11.5 }} onClick={() => navigate('/gallery')}>
          See all
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {recent.length === 0 ? (
          <div className="empty" style={{ padding: '24px 12px' }}>
            <strong>No sessions here yet</strong>
            <span>Record your first session and this page fills itself in.</span>
          </div>
        ) : (
          recent.map((session) => (
            <button
              key={session.id}
              className="session-row"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => navigate(`/editor/${session.id}`)}
            >
              <span className="session-row__thumb">
                <CameraFeed tone={sceneTone(session.id)} />
              </span>
              <span className="session-row__body">
                <span className="session-row__title" style={{ display: 'block' }}>
                  {session.tag_name ?? 'Untitled session'}
                </span>
                <span className="session-row__meta" style={{ display: 'block' }}>
                  {dayLabel(session.started_at)} · {timeRange(session.started_at, session.ended_at)}
                </span>
              </span>
              <span className="session-row__time">{formatShort(session.duration_seconds)}</span>
            </button>
          ))
        )}
      </div>

      <div style={{ height: 20 }} />

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={`@${user?.handle}`} subtitle={user?.display_name}>
        <div className="stack" style={{ gap: 8 }}>
          <button className="btn btn--ghost" onClick={() => navigate('/gallery')}>
            <Images size={16} /> Open gallery
          </button>
          <button
            className="btn btn--danger"
            onClick={async () => {
              setMenuOpen(false)
              await signOut()
            }}
          >
            Sign out
          </button>
        </div>
      </Sheet>
    </div>
  )
}
