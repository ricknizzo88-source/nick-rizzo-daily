create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_site_settings_updated_at on public.site_settings;

create trigger set_site_settings_updated_at
before update on public.site_settings
for each row
execute function public.set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "Site settings are readable by everyone" on public.site_settings;

create policy "Site settings are readable by everyone"
on public.site_settings
for select
using (true);

insert into public.site_settings (key, value)
values (
  'about',
  jsonb_build_object(
    'body',
    'I''m Nick, a Seattle-based creator documenting food and daily life.' || chr(10) || chr(10) ||
    'After reviewing hundreds of restaurants on social media, I built this site to make those recommendations easier to explore.' || chr(10) || chr(10) ||
    'Think of it as a searchable archive of my food adventures—organized by location, cuisine, and category so you can find your next meal without digging through endless videos.',
    'videoUrl',
    'https://www.youtube.com/watch?v=4LIt-vYJRuo',
    'videoUrls',
    jsonb_build_array('https://www.youtube.com/watch?v=4LIt-vYJRuo')
  )
)
on conflict (key) do nothing;
