# Instagram Supabase Grid

A Next.js App Router app backed by Supabase. It imports Instagram Graph API media into an `instagram_posts` staging table and organizes food videos into a curated directory.

## Database shape

- `instagram_posts`: raw Instagram Graph API imports keyed by `media_id`.
- `restaurants`: places featured in videos, including address, coordinates, price level, and links.
- `food_videos`: curated directory entries connected to Instagram media and optionally a restaurant.
- `directory_tags`: flexible filters for cuisine, dish, dietary notes, vibes, and neighborhoods.
- `food_video_tags`: many-to-many join between videos and tags.
- `collections`: editorial groupings like "Best ramen" or "Date night".
- `collection_videos`: ordered videos inside collections.
- `food_video_directory`: read-friendly view for the public grid, including restaurant details and tags.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
   - If you already ran the earlier schema, run `supabase/migrations/001_add_instagram_sync_status.sql` to add the sync columns.
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `INSTAGRAM_ACCESS_TOKEN`
   - `INSTAGRAM_USER_ID`
   - `META_GRAPH_API_VERSION`
   - `INSTAGRAM_SYNC_LIMIT`
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_TOKEN`
   - `YOUTUBE_API_KEY`
   - `YOUTUBE_CHANNEL_HANDLE`
   - `YOUTUBE_CHANNEL_ID`
   - `INSTAGRAM_FOLLOWER_COUNT`
   - `TIKTOK_FOLLOWER_COUNT`
4. Install dependencies and run the app:

```bash
npm install
npm run dev
```

## Public and admin pages

- `/`: public Food Tracker
- `/about`: public About Me page
- `/review`: private review queue
- `/admin/places`: private editable place directory

For deployment, set both `ADMIN_PASSWORD` and `ADMIN_SESSION_TOKEN` in Vercel.
When both are present, the private admin pages require login at `/admin/login`.
Use a long random value for `ADMIN_SESSION_TOKEN`.

## Social stats

The About page can show follower/subscriber counts on the social buttons.

- `YOUTUBE_API_KEY`: server-only YouTube Data API key used to fetch subscriber count.
- `YOUTUBE_CHANNEL_HANDLE`: YouTube handle, defaults to `@nickrizzodaily`.
- `YOUTUBE_CHANNEL_ID`: optional exact channel ID. If this is set, it is used instead of the handle.
- `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_USER_ID`: used to fetch Instagram follower count when Meta access is available.
- `INSTAGRAM_FOLLOWER_COUNT`: optional manual fallback if the Instagram API is not ready.
- `TIKTOK_FOLLOWER_COUNT`: optional manual TikTok follower count until TikTok API access is configured.

Counts are cached for one hour by Next.js so the page stays fast and avoids API rate limits.

## Import Instagram posts

```bash
npm run import:instagram
```

The importer fetches `id`, `caption`, `permalink`, `thumbnail_url`, `media_url`, `media_type`, and `timestamp` from the Instagram Graph API via `graph.facebook.com`. It stores the raw import in `instagram_posts`; the directory layer uses `food_videos` so posts can be reviewed, titled, tagged, attached to restaurants, and published.

## Sync latest Reels

The app exposes a server-side sync endpoint:

```bash
curl -X POST http://localhost:3000/api/sync-instagram
```

`POST /api/sync-instagram` fetches recent Instagram media, keeps Reels/video posts, inserts brand-new rows into `instagram_posts` with `status = 'Pending'`, and calls a placeholder `processPendingPost()` function for each new row. That placeholder is where the AI caption parsing workflow will go next.

Optional environment variable:

- `INSTAGRAM_SYNC_LIMIT`: how many recent Instagram media items the API route checks per sync. Defaults to `25`.

## Mock pipeline while Meta access is blocked

Seed fake pending Reels:

```bash
npm run seed:mock
```

Seed a real Instagram URL manually while API access is blocked:

```bash
npm run seed:url -- https://www.instagram.com/p/DZYyeQ5hBNJ/
```

Seed a YouTube Short from public oEmbed metadata:

```bash
npm run seed:youtube -- https://www.youtube.com/shorts/AINADSB1SFA
```

Process pending posts into reviewable `food_videos` rows:

```bash
curl -X POST http://localhost:3000/api/process-pending \
  -H "Content-Type: application/json" \
  -d '{"limit":10}'
```

The processing step uses `lib/process-pending-post.js`. It currently mocks the AI parsing step by deriving a title from the first caption line and turning hashtags into directory tags.

The processor now includes a conservative caption classifier:

- food/restaurant captions become `food_videos` rows with `status = 'review'`
- lifestyle captions such as "day in my life", "single", "GRWM", outfit, gym, or routine posts are marked `Ignored`
- captions with no food signals are also marked `Ignored` so the directory stays focused
