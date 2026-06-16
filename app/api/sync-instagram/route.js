import { NextResponse } from "next/server";
import { processPendingPost } from "@/lib/process-pending-post";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const DEFAULT_GRAPH_API_VERSION = "v23.0";
const DEFAULT_SYNC_LIMIT = "25";

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function fetchLatestInstagramReels() {
  const accessToken = requireEnv("INSTAGRAM_ACCESS_TOKEN");
  const instagramUserId = requireEnv("INSTAGRAM_USER_ID");
  const graphApiVersion =
    process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;
  const limit = process.env.INSTAGRAM_SYNC_LIMIT || DEFAULT_SYNC_LIMIT;

  const fields = [
    "id",
    "caption",
    "permalink",
    "thumbnail_url",
    "media_url",
    "media_type",
    "media_product_type",
    "timestamp"
  ].join(",");

  const params = new URLSearchParams({
    fields,
    access_token: accessToken,
    limit
  });

  const url = `https://graph.facebook.com/${graphApiVersion}/${instagramUserId}/media?${params}`;
  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Instagram Graph API request failed with ${response.status}: ${body}`
    );
  }

  const payload = await response.json();

  return (payload.data ?? []).filter((post) => {
    return post.media_product_type === "REELS" || post.media_type === "VIDEO";
  });
}

export async function POST() {
  try {
    const supabase = createSupabaseAdminClient();
    const reels = await fetchLatestInstagramReels();
    const mediaIds = reels.map((post) => post.id);

    if (mediaIds.length === 0) {
      return NextResponse.json({
        ok: true,
        fetched: 0,
        inserted: 0,
        processed: 0
      });
    }

    const { data: existingPosts, error: existingError } = await supabase
      .from("instagram_posts")
      .select("media_id")
      .in("media_id", mediaIds);

    if (existingError) {
      throw new Error(`Supabase lookup failed: ${existingError.message}`);
    }

    const existingMediaIds = new Set(
      (existingPosts ?? []).map((post) => post.media_id)
    );

    const newRows = reels
      .filter((post) => !existingMediaIds.has(post.id))
      .map((post) => ({
        media_id: post.id,
        caption: post.caption ?? null,
        permalink: post.permalink,
        thumbnail_url: post.thumbnail_url ?? null,
        media_url: post.media_url ?? null,
        media_type: post.media_type ?? null,
        media_product_type: post.media_product_type ?? null,
        status: "Pending",
        timestamp: post.timestamp,
        raw: post
      }));

    let insertedRows = [];

    if (newRows.length > 0) {
      const { data, error } = await supabase
        .from("instagram_posts")
        .insert(newRows)
        .select("*");

      if (error) {
        throw new Error(`Supabase insert failed: ${error.message}`);
      }

      insertedRows = data ?? [];
    }

    const processed = [];

    for (const post of insertedRows) {
      processed.push(await processPendingPost(supabase, post));
    }

    return NextResponse.json({
      ok: true,
      fetched: reels.length,
      inserted: insertedRows.length,
      processed: processed.length,
      skippedExisting: existingMediaIds.size
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}
