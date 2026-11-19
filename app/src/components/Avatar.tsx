import { initials } from '../lib/format'

type Props = {
  name: string
  hue: number
  size?: 'sm' | 'md' | 'lg'
  ring?: boolean
}

export function Avatar({ name, hue, size = 'md', ring = false }: Props) {
  const className = ['avatar', size === 'lg' ? 'avatar--lg' : size === 'sm' ? 'avatar--sm' : '', ring ? 'avatar--ring' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <span className={className} style={{ '--hue': hue } as React.CSSProperties} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
