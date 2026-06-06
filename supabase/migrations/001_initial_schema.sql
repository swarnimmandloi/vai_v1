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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Files table — each row is one AI response (JSON with topic/sections/cards/connections)
create table public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  canvas_id uuid references public.canvases(id) on delete cascade not null,
  path text not null,
  type text not null default 'frame' check (type in ('frame', 'map', 'preference', 'index')),
  content jsonb not null default '{}',
  position_x float not null default 100,
  position_y float not null default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, path)
);

-- File versions — snapshot before each edit
create table public.file_versions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.files(id) on delete cascade not null,
  content jsonb not null,
  created_at timestamptz default now()
);

-- Indexes
create index idx_projects_user_id on public.projects(user_id);
create index idx_canvases_project_id on public.canvases(project_id);
create index idx_files_canvas_id on public.files(canvas_id);
create index idx_files_user_path on public.files(user_id, path);
create index idx_file_versions_file_id on public.file_versions(file_id);

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
create trigger files_updated_at before update on public.files
  for each row execute function public.handle_updated_at();
