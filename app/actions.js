"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { slugify } from "@/lib/directory-utils";

function adminAuthConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_TOKEN);
}

async function requireAdmin() {
  if (!adminAuthConfigured()) {
    return;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("nrd_admin")?.value;

  if (token !== process.env.ADMIN_SESSION_TOKEN) {
    redirect("/admin/login");
  }
}

export async function loginAdmin(formData) {
  const password = String(formData.get("password") ?? "");

  if (!adminAuthConfigured()) {
    redirect("/review");
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    redirect("/admin/login?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set("nrd_admin", process.env.ADMIN_SESSION_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  redirect("/review");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("nrd_admin");
  redirect("/");
}

export async function updateAboutContent(formData) {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const body = String(formData.get("body") ?? "").trim();
  const videoUrls = String(formData.get("video_urls") ?? "")
    .split(/\n+/)
    .map((url) => url.trim())
    .filter(Boolean);

  if (!body) {
    throw new Error("About text is required.");
  }

  const { error } = await supabase.from("site_settings").upsert(
    {
      key: "about",
      value: {
        body,
        videoUrl: videoUrls[0] ?? "",
        videoUrls
      }
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(`Unable to update About Me content: ${error.message}`);
  }

  redirect("/about");
}

export async function createCollaboration(formData) {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const partnerName = String(formData.get("partner_name") ?? "").trim();
  const partnershipYear = String(formData.get("partnership_year") ?? "").trim();
  const videoTitles = formData
    .getAll("video_title")
    .map((value) => String(value ?? "").trim());
  const videoUrls = formData
    .getAll("video_url")
    .map((value) => String(value ?? "").trim());

  if (!partnerName) {
    throw new Error("Partner name is required.");
  }

  const partnershipDate = partnershipYear ? `${partnershipYear}-01-01` : null;

  const { data: partner, error } = await supabase
    .from("collaboration_partners")
    .insert({
      partner_name: partnerName,
      partnership_date: partnershipDate,
      is_published: true
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to create collaboration: ${error.message}`);
  }

  const videos = videoUrls
    .map((url, index) => ({
      partner_id: partner.id,
      title: videoTitles[index] || `Video ${index + 1}`,
      url,
      sort_order: index
    }))
    .filter((video) => video.url);

  if (videos.length > 0) {
    const { error: videoError } = await supabase
      .from("collaboration_videos")
      .insert(videos);

    if (videoError) {
      throw new Error(`Unable to save collaboration videos: ${videoError.message}`);
    }
  }

  redirect("/admin/collaborations");
}

export async function updatePlace(formData) {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || "Seattle";
  const category = String(formData.get("category") ?? "").trim() || null;

  if (!id || !name) {
    throw new Error("Place id and name are required.");
  }

  const slug = slugify([name, city].filter(Boolean).join(" "));

  const { error } = await supabase
    .from("restaurants")
    .update({
      name,
      slug,
      city,
      notes: category
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to update place: ${error.message}`);
  }

  const { error: videoError } = await supabase
    .from("food_videos")
    .update({
      city,
      region: "WA"
    })
    .eq("restaurant_id", id);

  if (videoError) {
    throw new Error(`Unable to update linked videos: ${videoError.message}`);
  }

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("video_label_")) {
      continue;
    }

    const videoId = key.replace("video_label_", "");
    const label = String(value ?? "").trim() || null;
    const { error: labelError } = await supabase
      .from("food_videos")
      .update({ dish_name: label })
      .eq("id", videoId)
      .eq("restaurant_id", id);

    if (labelError) {
      throw new Error(`Unable to update video label: ${labelError.message}`);
    }
  }

  redirect("/admin/places");
}

export async function removeVideoFromPlace(formData) {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const placeId = String(formData.get("place_id") ?? "").trim();
  const videoId = String(formData.get("video_id") ?? "").trim();

  if (!placeId || !videoId) {
    throw new Error("Place id and video id are required.");
  }

  const { error } = await supabase
    .from("food_videos")
    .update({
      restaurant_id: null,
      dish_name: null,
      status: "archived"
    })
    .eq("id", videoId)
    .eq("restaurant_id", placeId);

  if (error) {
    throw new Error(`Unable to remove video from place: ${error.message}`);
  }

  const { count, error: countError } = await supabase
    .from("food_videos")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", placeId)
    .in("status", ["review", "published"]);

  if (countError) {
    throw new Error(`Unable to refresh place videos: ${countError.message}`);
  }

  if (count === 0) {
    redirect("/admin/hidden");
  }

  redirect(`/places/edit?id=${encodeURIComponent(placeId)}`);
}

export async function deletePlace(formData) {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const placeId = String(formData.get("place_id") ?? "").trim();
  const confirmed = formData.get("confirm_delete") === "on";

  if (!placeId || !confirmed) {
    throw new Error("Confirm the place removal before deleting.");
  }

  const { error: videoError } = await supabase
    .from("food_videos")
    .update({
      restaurant_id: null,
      dish_name: null,
      status: "archived"
    })
    .eq("restaurant_id", placeId);

  if (videoError) {
    throw new Error(`Unable to archive linked videos: ${videoError.message}`);
  }

  const { error } = await supabase
    .from("restaurants")
    .delete()
    .eq("id", placeId);

  if (error) {
    throw new Error(`Unable to remove place: ${error.message}`);
  }

  redirect("/admin/places");
}

export async function saveReviewPlace(formData) {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const placeName = String(formData.get("place_name") ?? "").trim();
  const videoId = String(formData.get("video_id") ?? "").trim();

  if (!placeName || !videoId) {
    throw new Error("Name and video id are required.");
  }

  const city = String(formData.get("city") ?? "").trim() || "Seattle";
  const category = String(formData.get("category") ?? "").trim() || null;
  const slug = slugify([placeName, city].filter(Boolean).join(" "));

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .upsert(
      {
        name: placeName,
        slug,
        city,
        region: "WA",
        country: "US",
        notes: category
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (restaurantError) {
    throw new Error(`Unable to save place: ${restaurantError.message}`);
  }

  const { error: videoError } = await supabase
    .from("food_videos")
    .update({
      restaurant_id: restaurant.id,
      dish_name: category,
      city,
      region: "WA",
      status: "published"
    })
    .eq("id", videoId);

  if (videoError) {
    throw new Error(`Unable to attach video to place: ${videoError.message}`);
  }

  redirect("/review");
}

export async function createManualPlace(formData) {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const placeName = String(formData.get("place_name") ?? "").trim();

  if (!placeName) {
    throw new Error("Name is required.");
  }

  const city = String(formData.get("city") ?? "").trim() || "Seattle";
  const category = String(formData.get("category") ?? "").trim() || null;
  const videoUrl = String(formData.get("video_url") ?? "").trim() || null;
  const slug = slugify([placeName, city].filter(Boolean).join(" "));

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .upsert(
      {
        name: placeName,
        slug,
        city,
        region: "WA",
        country: "US",
        notes: category
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to create entry: ${error.message}`);
  }

  if (videoUrl) {
    const mediaId = `manual_${Date.now()}_${slug}`;
    const { error: videoError } = await supabase.from("food_videos").insert({
      instagram_media_id: mediaId,
      restaurant_id: restaurant.id,
      title: placeName,
      dish_name: category,
      permalink: videoUrl,
      media_type: "manual",
      published_at: new Date().toISOString(),
      status: "published",
      city,
      region: "WA",
      country: "US",
      raw: { source: "manual" }
    });

    if (videoError) {
      throw new Error(`Unable to attach video link: ${videoError.message}`);
    }
  }

  redirect("/admin/places");
}

export async function ignoreVideo(formData) {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const videoId = String(formData.get("video_id") ?? "").trim();
  const mediaId = String(formData.get("media_id") ?? "").trim();

  if (!videoId) {
    throw new Error("Video id is required.");
  }

  const { error: videoError } = await supabase
    .from("food_videos")
    .update({ status: "archived" })
    .eq("id", videoId);

  if (videoError) {
    throw new Error(`Unable to ignore video: ${videoError.message}`);
  }

  if (mediaId) {
    const { error: postError } = await supabase
      .from("instagram_posts")
      .update({ status: "Ignored" })
      .eq("media_id", mediaId);

    if (postError) {
      throw new Error(`Unable to ignore source post: ${postError.message}`);
    }
  }

  redirect("/review");
}
