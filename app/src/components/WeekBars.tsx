import { weekdayLabel } from '../lib/format'

export function WeekBars({ week }: { week: { date: string; seconds: number }[] }) {
  const max = Math.max(...week.map((day) => day.seconds), 1)
  return (
    <div className="bars" role="img" aria-label="Time recorded over the last seven days">
      {week.map((day) => (
        <div className="bars__col" key={day.date}>
          <div
            className="bars__bar"
            style={{ height: `${Math.max(3, Math.round((day.seconds / max) * 100))}%` }}
            title={`${Math.round(day.seconds / 60)} minutes`}
          />
          <span className="bars__label">{weekdayLabel(day.date)}</span>
        </div>
      ))}
    </div>
  )
}
