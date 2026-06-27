create table if not exists public.site_page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  visitor_id text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists site_page_views_created_at_idx
  on public.site_page_views (created_at desc);

create index if not exists site_page_views_path_idx
  on public.site_page_views (path);

create index if not exists site_page_views_visitor_idx
  on public.site_page_views (visitor_id);

alter table public.site_page_views enable row level security;
