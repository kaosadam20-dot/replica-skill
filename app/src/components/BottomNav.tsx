import { Aperture, Home, User, Users } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

const items = [
  { to: '/feed', label: 'Feed', icon: Home },
  { to: '/group', label: 'Group', icon: Users },
  { to: '/profile', label: 'You', icon: User },
]

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="bottom-nav" aria-label="Main">
      <button
        className={`nav-btn ${pathname === '/feed' ? 'nav-btn--active' : ''}`}
        onClick={() => navigate('/feed')}
        aria-label="Feed"
      >
        <Home size={21} strokeWidth={pathname === '/feed' ? 2.3 : 1.8} />
      </button>
      <button
        className={`nav-btn ${pathname === '/' ? 'nav-btn--active' : ''}`}
        onClick={() => navigate('/')}
        aria-label="Record a session"
      >
        <span className="nav-btn--camera">
          <Aperture size={21} strokeWidth={2} />
        </span>
      </button>
      <button
        className={`nav-btn ${pathname === '/group' ? 'nav-btn--active' : ''}`}
        onClick={() => navigate('/group')}
        aria-label="Study group"
      >
        <Users size={21} strokeWidth={pathname === '/group' ? 2.3 : 1.8} />
      </button>
      <button
        className={`nav-btn ${pathname === '/profile' ? 'nav-btn--active' : ''}`}
        onClick={() => navigate('/profile')}
        aria-label="Your profile"
      >
        <User size={21} strokeWidth={pathname === '/profile' ? 2.3 : 1.8} />
      </button>
    </nav>
  )
}
