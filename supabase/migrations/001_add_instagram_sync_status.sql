alter table public.instagram_posts
add column if not exists media_product_type text;

alter table public.instagram_posts
add column if not exists status text not null default 'Pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'instagram_posts_status_check'
      and conrelid = 'public.instagram_posts'::regclass
  ) then
    alter table public.instagram_posts
    add constraint instagram_posts_status_check
    check (status in ('Pending', 'Processing', 'Processed', 'Failed', 'Ignored'));
  end if;
end;
$$;

create index if not exists instagram_posts_status_idx
  on public.instagram_posts (status);
