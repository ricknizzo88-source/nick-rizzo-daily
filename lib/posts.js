import { createSupabaseBrowserlessClient } from "@/lib/supabase";

export async function getInstagramPosts() {
  const supabase = createSupabaseBrowserlessClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("instagram_posts")
    .select(
      "id, media_id, caption, permalink, thumbnail_url, media_url, media_type, timestamp"
    )
    .order("timestamp", { ascending: false });

  if (error) {
    throw new Error(`Unable to load Instagram posts: ${error.message}`);
  }

  return data ?? [];
}

export async function getFoodVideos() {
  const supabase = createSupabaseBrowserlessClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("food_videos")
    .select(
      "id, instagram_media_id, title, dish_name, caption, permalink, thumbnail_url, media_url, media_type, published_at, status, city, region, neighborhood"
    )
    .in("status", ["review", "published"])
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load food videos: ${error.message}`);
  }

  return data ?? [];
}
