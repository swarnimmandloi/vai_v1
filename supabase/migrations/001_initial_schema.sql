-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Canvases table
create table public.canvases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null default 'Canvas 1',
  order_index integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Frames table
create table public.frames (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid references public.canvases(id) on delete cascade not null,
  title text not null default '',
  position_x float not null default 100,
  position_y float not null default 100,
  width float not null default 380,
  layout_type text not null default 'grid' check (layout_type in ('grid', 'linear', 'mindmap', 'single')),
  parent_id uuid references public.frames(id) on delete set null,
  thread_id uuid not null default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Blocks table
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  frame_id uuid references public.frames(id) on delete cascade not null,
  block_type text not null check (block_type in ('icon_text', 'chart', 'list', 'stat', 'image', 'note')),
  order_index integer not null default 0,
  content jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Connections table (manual connections between frames)
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid references public.canvases(id) on delete cascade not null,
  source_frame_id uuid references public.frames(id) on delete cascade not null,
  target_frame_id uuid references public.frames(id) on delete cascade not null,
  label text,
  created_at timestamptz default now()
);

-- Indexes
create index idx_projects_user_id on public.projects(user_id);
create index idx_canvases_project_id on public.canvases(project_id);
create index idx_frames_canvas_id on public.frames(canvas_id);
create index idx_blocks_frame_id on public.blocks(frame_id);
create index idx_connections_canvas_id on public.connections(canvas_id);

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();
create trigger canvases_updated_at before update on public.canvases
  for each row execute function public.handle_updated_at();
create trigger frames_updated_at before update on public.frames
  for each row execute function public.handle_updated_at();
create trigger blocks_updated_at before update on public.blocks
  for each row execute function public.handle_updated_at();
