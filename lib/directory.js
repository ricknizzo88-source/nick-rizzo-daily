import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseBrowserlessClient } from "@/lib/supabase";
export { slugify, splitCategories, videoChipLabel } from "@/lib/directory-utils";

export async function loadDirectoryPlaces({ admin = false } = {}) {
  const supabase = admin
    ? createSupabaseAdminClient()
    : createSupabaseBrowserlessClient();

  if (!supabase) {
    return [];
  }

  const { data: videos, error } = await supabase
    .from("food_videos")
    .select(
      "id, title, dish_name, permalink, thumbnail_url, published_at, restaurant_id, restaurants(id, name, slug, city, category:notes)"
    )
    .not("restaurant_id", "is", null)
    .in("status", ["review", "published"])
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const places = new Map();

  for (const video of videos ?? []) {
    const restaurant = video.restaurants;

    if (!restaurant) {
      continue;
    }

    const existing = places.get(restaurant.id) ?? {
      ...restaurant,
      videos: []
    };

    existing.videos.push(video);
    places.set(restaurant.id, existing);
  }

  if (!admin) {
    return [...places.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  const { data: restaurants, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name, slug, city, category:notes")
    .order("name", { ascending: true });

  if (restaurantError) {
    throw new Error(restaurantError.message);
  }

  for (const restaurant of restaurants ?? []) {
    if (!places.has(restaurant.id)) {
      places.set(restaurant.id, { ...restaurant, videos: [] });
    }
  }

  return [...places.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadPlace(id) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, city, category:notes")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Unable to load place: ${error.message}`);
  }

  const { data: videos, error: videosError } = await supabase
    .from("food_videos")
    .select("id, title, dish_name, permalink")
    .eq("restaurant_id", id)
    .order("published_at", { ascending: false });

  if (videosError) {
    throw new Error(`Unable to load place videos: ${videosError.message}`);
  }

  return { ...data, videos: videos ?? [] };
}

export async function loadReviewVideos() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("food_videos")
    .select(
      "id, instagram_media_id, title, caption, dish_name, permalink, thumbnail_url, media_url, published_at, status, restaurant_id"
    )
    .is("restaurant_id", null)
    .eq("status", "review")
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
