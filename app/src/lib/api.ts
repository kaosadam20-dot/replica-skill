import type { GroupData, LiveUser, Post, Proof, Session, Tag, User } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || 'Something went wrong.')
  }
  return data as T
}

export const api = {
  me: () => request<{ user: User | null; todaySeconds: number; streak: number }>('/api/me'),
  start: (handle: string) =>
    request<{ user: User }>('/api/auth/start', { method: 'POST', body: JSON.stringify({ handle }) }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),

  home: () =>
    request<{ user: User; tags: Tag[]; todaySeconds: number; streak: number; live: LiveUser[] }>('/api/home'),
  tags: () => request<{ tags: Tag[] }>('/api/tags'),

  saveSession: (input: {
    startedAt: string
    endedAt: string
    durationSeconds: number
    mode: string
    cameraOn: boolean
    tagName: string
    visibility: 'private' | 'friends'
  }) => request<{ session: Session; streak: number; todaySeconds: number }>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  sessions: (limit = 120) => request<{ sessions: Session[] }>(`/api/sessions?limit=${limit}`),
  deleteSession: (id: string) => request<{ ok: true }>(`/api/sessions/${id}`, { method: 'DELETE' }),

  stats: () => request<Proof>('/api/stats'),
  feed: () => request<{ posts: Post[] }>('/api/feed'),
  kudos: (id: string) => request<{ liked: boolean; count: number }>(`/api/sessions/${id}/kudos`, { method: 'POST' }),
  comment: (id: string, body: string) =>
    request<{ comment: Post['comments'][number] }>(`/api/sessions/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  group: () => request<GroupData>('/api/group'),
  nudge: (toUserId: string) =>
    request<{ ok: true }>('/api/nudges', { method: 'POST', body: JSON.stringify({ toUserId }) }),
}
