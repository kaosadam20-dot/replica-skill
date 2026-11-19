import { Hand } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { StatusBar } from '../components/StatusBar'
import { TrendChart } from '../components/TrendChart'
import { api } from '../lib/api'
import { formatClock, formatShort } from '../lib/format'
import type { GroupData, LiveUser } from '../lib/types'
import { useAuth } from '../state/AuthContext'
import { useToast } from '../state/ToastContext'

export function Group() {
  const { user } = useAuth()
  const { show } = useToast()
  const [data, setData] = useState<GroupData | null>(null)
  const [nudged, setNudged] = useState<LiveUser | null>(null)

  useEffect(() => {
    api
      .group()
      .then(setData)
      .catch(() => undefined)
  }, [])

  const nudge = async (friend: LiveUser) => {
    try {
      await api.nudge(friend.id)
      setNudged(friend)
    } catch (caught) {
      show((caught as Error).message)
    }
  }

  const max = Math.max(1, ...(data?.leaderboard.map((row) => row.seconds) ?? [1]))
  const week = data?.leaderboard.reduce((total, row) => total + row.seconds, 0) ?? 0

  return (
    <div className="screen">
      <StatusBar />
      <div className="page-head">
        <div>
          <div className="page-title">Study group</div>
          <div className="page-sub">
            {data ? `${data.live.length} locked in right now` : 'Loading your circle…'}
          </div>
        </div>
        <span className="streak-pill">
          <Hand size={13} color="var(--accent)" /> {formatShort(week)} this week
        </span>
      </div>

      <div className="live-row">
        {(data?.live ?? []).map((friend) => (
          <div className="live-card" key={friend.id}>
            <Avatar name={friend.display_name} hue={friend.avatar_hue} size="lg" ring />
            <span className="live-card__time">{formatClock(friend.live_seconds)}</span>
            <span className="live-card__name">@{friend.handle}</span>
            <button className="pill-btn" style={{ height: 30, fontSize: 11 }} onClick={() => nudge(friend)}>
              <Hand size={12} /> Nudge
            </button>
          </div>
        ))}
        {data && data.live.length === 0 ? (
          <div className="live-card" style={{ width: '100%', alignItems: 'flex-start' }}>
            <span className="live-card__name" style={{ whiteSpace: 'normal', textAlign: 'left' }}>
              Nobody is live right now. Be the one your friends see when they open the app.
            </span>
          </div>
        ) : null}
      </div>

      {nudged ? (
        <div className="nudge-card">
          <Hand size={16} color="var(--accent)" />
          Nudged @{nudged.handle} to lock in.
        </div>
      ) : null}

      <div className="proof-card" style={{ marginTop: 12 }}>
        <div className="spread" style={{ marginBottom: 4 }}>
          <span className="eyebrow">Last seven days</span>
          <span className="dim" style={{ fontSize: 10.5 }}>
            cumulative
          </span>
        </div>
        {data ? <TrendChart series={data.series} /> : <div className="skeleton" style={{ height: 90 }} />}
        <div className="chart-legend">
          {(data?.series ?? []).map((entry) => (
            <span key={entry.user_id}>
              <i style={{ background: `hsl(${entry.avatar_hue} 62% 64%)` }} />@{entry.handle}
            </span>
          ))}
        </div>
      </div>

      <div className="section-head">
        <h2>This week</h2>
        <span>{data?.leaderboard.length ?? 0} people</span>
      </div>

      <div className="leaderboard">
        {(data?.leaderboard ?? []).map((row, index) => (
          <div className="leader-row" key={row.id}>
            <span className="leader-rank">{index + 1}</span>
            <Avatar name={row.display_name} hue={row.avatar_hue} size="sm" />
            <div className="leader-body">
              <div className="leader-name">
                <span>
                  {row.display_name}
                  {row.id === user?.id ? ' (you)' : ''}
                </span>
                <span>{row.seconds > 0 ? formatShort(row.seconds) : '–'}</span>
              </div>
              <div className="leader-bar">
                <i style={{ width: `${Math.round((row.seconds / max) * 100)}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 24 }} />
    </div>
  )
}
