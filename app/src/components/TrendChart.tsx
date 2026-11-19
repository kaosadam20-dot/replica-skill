import type { GroupData } from '../lib/types'

export function TrendChart({ series }: { series: GroupData['series'] }) {
  const width = 320
  const height = 90
  const max = Math.max(1, ...series.flatMap((entry) => entry.points))
  const stepX = width / 6

  return (
    <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="#26262a" strokeWidth="1" />
      {series.map((entry) => {
        const points = entry.points
          .map((value, index) => {
            const x = index * stepX
            const y = height - 6 - (value / max) * (height - 16)
            return `${x.toFixed(1)},${y.toFixed(1)}`
          })
          .join(' ')
        return (
          <polyline
            key={entry.user_id}
            points={points}
            fill="none"
            stroke={`hsl(${entry.avatar_hue} 62% 64%)`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </svg>
  )
}
