import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { useAuth, AuthProvider } from './state/AuthContext'
import { ToastProvider } from './state/ToastContext'
import { ActiveSession } from './screens/ActiveSession'
import { Editor } from './screens/Editor'
import { Feed } from './screens/Feed'
import { Gallery } from './screens/Gallery'
import { Group } from './screens/Group'
import { Login } from './screens/Login'
import { Profile } from './screens/Profile'
import { Record } from './screens/Record'
import { SaveSession } from './screens/SaveSession'

function Shell() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="loading">Opening Latent…</div>
  }

  if (!user) {
    return <Login />
  }

  const immersive = ['/session', '/save', '/editor'].some((path) => location.pathname.startsWith(path))

  return (
    <>
      <Routes>
        <Route path="/" element={<Record />} />
        <Route path="/session" element={<ActiveSession />} />
        <Route path="/save" element={<SaveSession />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/group" element={<Group />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {immersive ? null : <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="stage">
          <div className="phone">
            <ToastProvider>
              <Shell />
            </ToastProvider>
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
