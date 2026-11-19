import { Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SessionCard } from '../components/SessionCard'
import { StatusBar } from '../components/StatusBar'
import { api } from '../lib/api'
import type { Post } from '../lib/types'
import { useAuth } from '../state/AuthContext'
import { useToast } from '../state/ToastContext'

export function Feed() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { show } = useToast()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    api
      .feed()
      .then((data) => setPosts(data.posts))
      .catch((caught) => setError((caught as Error).message))
  }

  useEffect(load, [])

  const toggleKudos = async (id: string) => {
    setPosts((current) =>
      (current ?? []).map((post) => {
        if (post.id !== id) return post
        const liked = !post.liked
        const givers = liked
          ? [...post.kudos_givers, user?.display_name ?? 'You']
          : post.kudos_givers.filter((name) => name !== user?.display_name)
        return { ...post, liked, kudos_count: post.kudos_count + (liked ? 1 : -1), kudos_givers: givers }
      }),
    )
    try {
      const result = await api.kudos(id)
      setPosts((current) =>
        (current ?? []).map((post) => (post.id === id ? { ...post, liked: result.liked, kudos_count: result.count } : post)),
      )
    } catch (caught) {
      show((caught as Error).message)
      load()
    }
  }

  const addComment = async (id: string, body: string) => {
    try {
      const result = await api.comment(id, body)
      setPosts((current) =>
        (current ?? []).map((post) =>
          post.id === id
            ? { ...post, comments: [...post.comments, result.comment], comment_count: post.comment_count + 1 }
            : post,
        ),
      )
    } catch (caught) {
      show((caught as Error).message)
    }
  }

  return (
    <div className="screen">
      <StatusBar />
      <div className="page-head">
        <div>
          <div className="page-title">Feed</div>
          <div className="page-sub">Effort from people who keep you honest.</div>
        </div>
        <button className="icon-btn" onClick={() => navigate('/group')} aria-label="Open study group">
          <Users size={18} />
        </button>
      </div>

      {error ? <div className="form-error" style={{ padding: '0 16px' }}>{error}</div> : null}

      {posts === null ? (
        <div style={{ padding: '0 16px' }}>
          <div className="skeleton" style={{ height: 320 }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="empty">
          <strong>Nobody has shared yet</strong>
          <span>Record a session and share it with your friends to start the feed.</span>
          <button className="btn btn--primary" style={{ marginTop: 12, maxWidth: 220 }} onClick={() => navigate('/')}>
            Record something
          </button>
        </div>
      ) : (
        posts.map((post) => <SessionCard key={post.id} post={post} onKudos={toggleKudos} onComment={addComment} />)
      )}
    </div>
  )
}
