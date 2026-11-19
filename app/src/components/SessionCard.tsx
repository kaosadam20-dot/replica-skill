import { Heart, MessageCircle, Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { formatShort, relativeTime, sceneTone, timeRange } from '../lib/format'
import type { Post } from '../lib/types'
import { Avatar } from './Avatar'
import { CameraFeed } from './CameraFeed'

type Props = {
  post: Post
  onKudos: (id: string) => void
  onComment: (id: string, body: string) => Promise<void>
}

export function SessionCard({ post, onKudos, onComment }: Props) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    try {
      await onComment(post.id, body)
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  const kudosNames = post.kudos_givers
  const kudosLine =
    kudosNames.length === 0
      ? 'Be the first to give kudos'
      : kudosNames.length === 1
        ? `Kudos from ${kudosNames[0]}`
        : `Kudos from ${kudosNames[0]} and ${kudosNames.length - 1} other${kudosNames.length === 2 ? '' : 's'}`

  return (
    <article className="post">
      <header className="post__head">
        <Avatar name={post.display_name} hue={post.avatar_hue} />
        <div className="post__who">
          <div className="post__name">{post.display_name}</div>
          <div className="post__meta">
            @{post.handle} · {relativeTime(post.started_at)}
          </div>
        </div>
        {post.tag_name ? (
          <span className="tag-pill">
            <i className="tag-dot" style={{ background: post.tag_color ?? 'var(--accent)' }} />
            {post.tag_name}
          </span>
        ) : null}
      </header>

      <div className="post__media">
        <CameraFeed tone={sceneTone(post.id)} />
        <div className="post__overlay">
          <span className="duration-badge">{formatShort(post.duration_seconds)}</span>
          <span className="duration-badge">{timeRange(post.started_at, post.ended_at)}</span>
        </div>
      </div>

      <div className="post__actions">
        <button
          className={`post__action ${post.liked ? 'post__action--on' : ''}`}
          onClick={() => onKudos(post.id)}
          aria-pressed={post.liked}
          aria-label={post.liked ? 'Remove kudos' : 'Give kudos'}
        >
          <Heart size={17} fill={post.liked ? 'currentColor' : 'none'} />
          {post.kudos_count}
        </button>
        <button className="post__action" onClick={() => inputRef.current?.focus()} aria-label="Write a comment">
          <MessageCircle size={17} />
          {post.comment_count}
        </button>
        <span style={{ flex: 1 }} />
        {post.camera_on ? null : <span className="post__meta">camera off</span>}
      </div>

      <div className="post__kudos">{kudosLine}</div>

      {post.comments.length > 0 ? (
        <div className="post__comments">
          {post.comments.map((comment) => (
            <div className="comment" key={comment.id}>
              <strong>@{comment.handle}</strong>
              <span>{comment.body}</span>
            </div>
          ))}
        </div>
      ) : null}

      <form className="post__comments" onSubmit={submit} style={{ paddingTop: 0 }}>
        <div className="comment-form">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Say something"
            aria-label={`Comment on ${post.display_name}'s session`}
            maxLength={240}
          />
          <button type="submit" disabled={!draft.trim() || sending} aria-label="Send comment">
            <Send size={14} />
          </button>
        </div>
      </form>
    </article>
  )
}
