create table if not exists public.supplements (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  brand text,
  category text,
  dose_per_serving text,
  servings_per_day numeric default 1,
  timing text[] default '{}',
  timing_notes text,
  nutrients jsonb default '[]'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.supplements enable row level security;

create policy "Public access" on public.supplements
  for all to anon, authenticated
  using (true)
  with check (true);
