create table if not exists public.collaboration_partners (
  id uuid primary key default gen_random_uuid(),
  partner_name text not null,
  partnership_date date,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collaboration_partners_published_idx
  on public.collaboration_partners (is_published, partnership_date desc);

drop trigger if exists set_collaboration_partners_updated_at
  on public.collaboration_partners;

create trigger set_collaboration_partners_updated_at
before update on public.collaboration_partners
for each row
execute function public.set_updated_at();

create table if not exists public.collaboration_videos (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.collaboration_partners(id) on delete cascade,
  title text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collaboration_videos_partner_idx
  on public.collaboration_videos (partner_id, sort_order);

drop trigger if exists set_collaboration_videos_updated_at
  on public.collaboration_videos;

create trigger set_collaboration_videos_updated_at
before update on public.collaboration_videos
for each row
execute function public.set_updated_at();
