import { X } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
}

export function Sheet({ open, onClose, title, subtitle, children }: Props) {
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Sheet'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet__grab" />
        {title ? (
          <div className="spread" style={{ marginBottom: 14 }}>
            <div>
              <div className="sheet__title">{title}</div>
              {subtitle ? <div className="sheet__sub">{subtitle}</div> : null}
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={17} />
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
}
