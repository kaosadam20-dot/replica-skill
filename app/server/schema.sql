create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  display_name text not null,
  avatar_hue integer not null default 40,
  bio text not null default '',
  live_since timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  color text not null default '#E7B44C',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tag_id uuid references tags(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds > 0),
  mode text not null default 'stopwatch' check (mode in ('stopwatch', 'goal', 'pomodoro')),
  camera_on boolean not null default true,
  visibility text not null default 'private' check (visibility in ('private', 'friends')),
  created_at timestamptz not null default now(),
  constraint session_has_positive_span check (ended_at > started_at)
);
create index if not exists sessions_user_started_idx on sessions (user_id, started_at desc);
create index if not exists sessions_visibility_idx on sessions (visibility, started_at desc);

create table if not exists kudos (
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists comments_session_idx on comments (session_id, created_at);

create table if not exists nudges (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references users(id) on delete cascade,
  to_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists friendships (
  user_id uuid not null references users(id) on delete cascade,
  friend_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint no_self_friendship check (user_id <> friend_id)
);
