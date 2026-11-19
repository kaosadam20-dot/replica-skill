import type { HeatmapDay } from '../lib/types'

const level = (seconds: number) => {
  if (seconds <= 0) return 0
  if (seconds < 30 * 60) return 1
  if (seconds < 60 * 60) return 2
  if (seconds < 2 * 60 * 60) return 3
  return 4
}

export function Heatmap({ days }: { days: HeatmapDay[] }) {
  return (
    <div className="heatmap-wrap">
      <div className="heatmap" role="img" aria-label="Days you recorded, last seventeen weeks">
        {days.map((day) => (
          <div
            key={day.date}
            className="heatmap__cell"
            data-level={level(day.seconds)}
            title={
              day.seconds > 0
                ? `${new Date(`${day.date}T12:00:00Z`).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })} · ${Math.round(day.seconds / 60)}m`
                : `${new Date(`${day.date}T12:00:00Z`).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })} · no session`
            }
          />
        ))}
      </div>
    </div>
  )
}

export function HeatmapLegend() {
  return (
    <div className="legend" aria-hidden="true">
      <span>less</span>
      <i style={{ background: '#1d1d1f' }} />
      <i style={{ background: 'rgba(231,180,76,.2)' }} />
      <i style={{ background: 'rgba(231,180,76,.42)' }} />
      <i style={{ background: 'rgba(231,180,76,.66)' }} />
      <i style={{ background: 'var(--accent)' }} />
      <span>more</span>
    </div>
  )
}
