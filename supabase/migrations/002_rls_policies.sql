-- Enable RLS
alter table public.projects enable row level security;
alter table public.canvases enable row level security;
alter table public.files enable row level security;
alter table public.file_versions enable row level security;

-- Projects: users only see their own
create policy "own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Canvases: accessible if user owns the parent project
create policy "own canvases"
  on public.canvases for all
  using (
    exists (select 1 from public.projects where id = project_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects where id = project_id and user_id = auth.uid())
  );

-- Files: users own their files directly
create policy "own files"
  on public.files for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- File versions: accessible if user owns the file
create policy "own file versions"
  on public.file_versions for all
  using (
    exists (select 1 from public.files where id = file_id and user_id = auth.uid())
  );
