drop policy if exists "Published food videos are readable by everyone" on public.food_videos;
drop policy if exists "Reviewable food videos are readable by everyone" on public.food_videos;

create policy "Reviewable food videos are readable by everyone"
on public.food_videos
for select
using (status in ('review', 'published'));
