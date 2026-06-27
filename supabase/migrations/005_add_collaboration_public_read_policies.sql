alter table public.collaboration_partners enable row level security;
alter table public.collaboration_videos enable row level security;

drop policy if exists "Public can read published collaboration partners"
  on public.collaboration_partners;

create policy "Public can read published collaboration partners"
on public.collaboration_partners
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Public can read published collaboration videos"
  on public.collaboration_videos;

create policy "Public can read published collaboration videos"
on public.collaboration_videos
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.collaboration_partners
    where collaboration_partners.id = collaboration_videos.partner_id
      and collaboration_partners.is_published = true
  )
);
