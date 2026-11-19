import { BatteryFull, Signal, Wifi } from 'lucide-react'
import { useEffect, useState } from 'react'

export function StatusBar({ overlay = false }: { overlay?: boolean }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className={`status-bar ${overlay ? 'status-bar--overlay' : ''}`} aria-hidden="true">
      <span>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
      <div className="status-bar__icons">
        <Signal size={12} strokeWidth={2.2} />
        <Wifi size={12} strokeWidth={2.2} />
        <BatteryFull size={15} strokeWidth={2} />
      </div>
    </div>
  )
}
