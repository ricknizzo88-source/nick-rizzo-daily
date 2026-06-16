create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Raw Instagram import table. Keep this close to the Graph API response so
-- imports can be repeated safely even before a video has been curated.
create table if not exists public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  media_id text not null unique,
  caption text,
  permalink text not null,
  thumbnail_url text,
  media_url text,
  media_type text,
  media_product_type text,
  status text not null default 'Pending'
    check (status in ('Pending', 'Processing', 'Processed', 'Failed', 'Ignored')),
  timestamp timestamptz not null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists instagram_posts_timestamp_idx
  on public.instagram_posts (timestamp desc);

create index if not exists instagram_posts_status_idx
  on public.instagram_posts (status);

create index if not exists instagram_posts_search_idx
  on public.instagram_posts
  using gin (to_tsvector('english', coalesce(caption, '') || ' ' || media_id));

drop trigger if exists set_instagram_posts_updated_at on public.instagram_posts;

create trigger set_instagram_posts_updated_at
before update on public.instagram_posts
for each row
execute function public.set_updated_at();

-- Places featured in food videos.
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  instagram_handle text,
  website_url text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country text not null default 'US',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  price_level smallint check (price_level between 1 and 4),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists restaurants_location_idx
  on public.restaurants (city, region, country);

create index if not exists restaurants_search_idx
  on public.restaurants
  using gin (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' ||
      coalesce(instagram_handle, '') || ' ' ||
      coalesce(city, '') || ' ' ||
      coalesce(region, '')
    )
  );

drop trigger if exists set_restaurants_updated_at on public.restaurants;

create trigger set_restaurants_updated_at
before update on public.restaurants
for each row
execute function public.set_updated_at();

-- Curated food videos shown in the directory.
create table if not exists public.food_videos (
  id uuid primary key default gen_random_uuid(),
  instagram_post_id uuid references public.instagram_posts(id) on delete set null,
  instagram_media_id text not null unique,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  title text,
  dish_name text,
  caption text,
  permalink text not null,
  thumbnail_url text,
  media_url text,
  media_type text,
  published_at timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  is_featured boolean not null default false,
  rating numeric(2, 1) check (rating is null or (rating >= 0 and rating <= 5)),
  price_note text,
  neighborhood text,
  city text,
  region text,
  country text not null default 'US',
  notes text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_videos_published_at_idx
  on public.food_videos (published_at desc);

create index if not exists food_videos_status_idx
  on public.food_videos (status);

create index if not exists food_videos_restaurant_idx
  on public.food_videos (restaurant_id);

create index if not exists food_videos_directory_location_idx
  on public.food_videos (city, region, neighborhood);

create index if not exists food_videos_search_idx
  on public.food_videos
  using gin (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' ||
      coalesce(dish_name, '') || ' ' ||
      coalesce(caption, '') || ' ' ||
      coalesce(neighborhood, '') || ' ' ||
      coalesce(city, '') || ' ' ||
      coalesce(region, '')
    )
  );

drop trigger if exists set_food_videos_updated_at on public.food_videos;

create trigger set_food_videos_updated_at
before update on public.food_videos
for each row
execute function public.set_updated_at();

-- Flexible labels for filtering. Examples:
-- cuisine: "Thai", "Mexican"; dish: "tacos"; dietary: "vegan";
-- vibe: "date night"; neighborhood: "Silver Lake".
create table if not exists public.directory_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tag_type text not null default 'general'
    check (tag_type in ('general', 'cuisine', 'dish', 'dietary', 'vibe', 'neighborhood')),
  created_at timestamptz not null default now()
);

create index if not exists directory_tags_type_idx
  on public.directory_tags (tag_type, name);

create table if not exists public.food_video_tags (
  food_video_id uuid not null references public.food_videos(id) on delete cascade,
  tag_id uuid not null references public.directory_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (food_video_id, tag_id)
);

create index if not exists food_video_tags_tag_idx
  on public.food_video_tags (tag_id);

-- Optional editorial groupings, like "Best ramen", "Weekend brunch",
-- or "Date night under $50".
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_collections_updated_at on public.collections;

create trigger set_collections_updated_at
before update on public.collections
for each row
execute function public.set_updated_at();

create table if not exists public.collection_videos (
  collection_id uuid not null references public.collections(id) on delete cascade,
  food_video_id uuid not null references public.food_videos(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, food_video_id)
);

create index if not exists collection_videos_video_idx
  on public.collection_videos (food_video_id);

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

create or replace view public.food_video_directory
with (security_invoker = true)
as
select
  food_videos.id,
  food_videos.instagram_media_id,
  food_videos.title,
  food_videos.dish_name,
  food_videos.caption,
  food_videos.permalink,
  food_videos.thumbnail_url,
  food_videos.media_url,
  food_videos.media_type,
  food_videos.published_at,
  food_videos.is_featured,
  food_videos.rating,
  food_videos.price_note,
  food_videos.neighborhood,
  food_videos.city,
  food_videos.region,
  food_videos.country,
  restaurants.id as restaurant_id,
  restaurants.name as restaurant_name,
  restaurants.slug as restaurant_slug,
  restaurants.instagram_handle as restaurant_instagram_handle,
  restaurants.website_url as restaurant_website_url,
  restaurants.address_line1 as restaurant_address_line1,
  restaurants.address_line2 as restaurant_address_line2,
  restaurants.postal_code as restaurant_postal_code,
  restaurants.latitude as restaurant_latitude,
  restaurants.longitude as restaurant_longitude,
  restaurants.price_level as restaurant_price_level,
  coalesce(
    jsonb_agg(
      distinct jsonb_build_object(
        'id', directory_tags.id,
        'name', directory_tags.name,
        'slug', directory_tags.slug,
        'type', directory_tags.tag_type
      )
    ) filter (where directory_tags.id is not null),
    '[]'::jsonb
  ) as tags
from public.food_videos
left join public.restaurants
  on restaurants.id = food_videos.restaurant_id
left join public.food_video_tags
  on food_video_tags.food_video_id = food_videos.id
left join public.directory_tags
  on directory_tags.id = food_video_tags.tag_id
where food_videos.status = 'published'
group by food_videos.id, restaurants.id;

-- Public read access for the directory. Writes should happen from server scripts
-- or authenticated admin tooling only.
alter table public.instagram_posts enable row level security;
alter table public.restaurants enable row level security;
alter table public.food_videos enable row level security;
alter table public.directory_tags enable row level security;
alter table public.food_video_tags enable row level security;
alter table public.collections enable row level security;
alter table public.collection_videos enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Instagram posts are readable by everyone" on public.instagram_posts;
drop policy if exists "Restaurants are readable by everyone" on public.restaurants;
drop policy if exists "Published food videos are readable by everyone" on public.food_videos;
drop policy if exists "Reviewable food videos are readable by everyone" on public.food_videos;
drop policy if exists "Directory tags are readable by everyone" on public.directory_tags;
drop policy if exists "Food video tags are readable by everyone" on public.food_video_tags;
drop policy if exists "Published collections are readable by everyone" on public.collections;
drop policy if exists "Collection videos are readable by everyone" on public.collection_videos;
drop policy if exists "Site settings are readable by everyone" on public.site_settings;

create policy "Instagram posts are readable by everyone"
on public.instagram_posts
for select
using (true);

create policy "Restaurants are readable by everyone"
on public.restaurants
for select
using (true);

create policy "Reviewable food videos are readable by everyone"
on public.food_videos
for select
using (status in ('review', 'published'));

create policy "Directory tags are readable by everyone"
on public.directory_tags
for select
using (true);

create policy "Food video tags are readable by everyone"
on public.food_video_tags
for select
using (
  exists (
    select 1
    from public.food_videos
    where food_videos.id = food_video_tags.food_video_id
      and food_videos.status = 'published'
  )
);

create policy "Published collections are readable by everyone"
on public.collections
for select
using (is_published = true);

create policy "Collection videos are readable by everyone"
on public.collection_videos
for select
using (
  exists (
    select 1
    from public.collections
    where collections.id = collection_videos.collection_id
      and collections.is_published = true
  )
);

create policy "Site settings are readable by everyone"
on public.site_settings
for select
using (true);
