export type User = {
  id: string
  handle: string
  display_name: string
  avatar_hue: number
  bio: string
}

export type Tag = {
  id: string
  name: string
  color: string
}

export type Session = {
  id: string
  started_at: string
  ended_at: string
  duration_seconds: number
  mode: 'stopwatch' | 'goal' | 'pomodoro'
  camera_on: boolean
  visibility: 'private' | 'friends'
  tag_name: string | null
  tag_color: string | null
}

export type Comment = {
  id: string
  session_id: string
  body: string
  created_at: string
  handle: string
  display_name: string
  avatar_hue: number
}

export type Post = Session & {
  user_id: string
  handle: string
  display_name: string
  avatar_hue: number
  kudos_count: number
  comment_count: number
  liked: boolean
  comments: Comment[]
  kudos_givers: string[]
}

export type LiveUser = {
  id: string
  handle: string
  display_name: string
  avatar_hue: number
  live_seconds: number
  tag_name?: string | null
}

export type HeatmapDay = { date: string; seconds: number }

export type Proof = {
  totals: { seconds: number; sessions: number; longest: number; dailyAverage: number }
  streak: number
  todaySeconds: number
  heatmap: HeatmapDay[]
  week: { date: string; seconds: number }[]
  trend: { thisWeek: number; lastWeek: number; percent: number }
  recent: Session[]
}

export type GroupData = {
  leaderboard: {
    id: string
    handle: string
    display_name: string
    avatar_hue: number
    seconds: number
    sessions: number
  }[]
  live: LiveUser[]
  series: { user_id: string; handle: string; avatar_hue: number; points: number[] }[]
}
