-- Enable RLS
alter table public.projects enable row level security;
alter table public.canvases enable row level security;
alter table public.frames enable row level security;
alter table public.blocks enable row level security;
alter table public.connections enable row level security;

-- Projects: users only see their own
create policy "Users can manage their own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Canvases: users can access canvases in their projects
create policy "Users can manage canvases in their projects"
  on public.canvases for all
  using (
    exists (
      select 1 from public.projects
      where id = project_id and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where id = project_id and user_id = auth.uid()
    )
  );

-- Frames: users can access frames in their canvases
create policy "Users can manage frames in their canvases"
  on public.frames for all
  using (
    exists (
      select 1 from public.canvases c
      join public.projects p on p.id = c.project_id
      where c.id = canvas_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.canvases c
      join public.projects p on p.id = c.project_id
      where c.id = canvas_id and p.user_id = auth.uid()
    )
  );

-- Blocks: users can access blocks in their frames
create policy "Users can manage blocks in their frames"
  on public.blocks for all
  using (
    exists (
      select 1 from public.frames f
      join public.canvases c on c.id = f.canvas_id
      join public.projects p on p.id = c.project_id
      where f.id = frame_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.frames f
      join public.canvases c on c.id = f.canvas_id
      join public.projects p on p.id = c.project_id
      where f.id = frame_id and p.user_id = auth.uid()
    )
  );

-- Connections: users can access connections in their canvases
create policy "Users can manage connections in their canvases"
  on public.connections for all
  using (
    exists (
      select 1 from public.canvases c
      join public.projects p on p.id = c.project_id
      where c.id = canvas_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.canvases c
      join public.projects p on p.id = c.project_id
      where c.id = canvas_id and p.user_id = auth.uid()
    )
  );
