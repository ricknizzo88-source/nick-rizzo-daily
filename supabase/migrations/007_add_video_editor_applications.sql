create table if not exists public.video_editor_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  timezone text,
  portfolio_url text not null,
  social_links text,
  editing_software text,
  availability text,
  rate_expectation text,
  fit_notes text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists video_editor_applications_created_at_idx
  on public.video_editor_applications (created_at desc);

create index if not exists video_editor_applications_status_idx
  on public.video_editor_applications (status);

alter table public.video_editor_applications enable row level security;
