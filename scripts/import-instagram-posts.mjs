import { createClient } from "@supabase/supabase-js";

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  INSTAGRAM_ACCESS_TOKEN,
  INSTAGRAM_USER_ID,
  INSTAGRAM_IMPORT_LIMIT = "100",
  META_GRAPH_API_VERSION = "v23.0"
} = process.env;

const required = {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  INSTAGRAM_ACCESS_TOKEN,
  INSTAGRAM_USER_ID
};

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

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
  access_token: INSTAGRAM_ACCESS_TOKEN,
  limit: INSTAGRAM_IMPORT_LIMIT
});

let nextUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${INSTAGRAM_USER_ID}/media?${params}`;
let imported = 0;
let page = 1;

while (nextUrl) {
  const response = await fetch(nextUrl);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Instagram Graph API request failed with ${response.status}: ${body}`
    );
  }

  const payload = await response.json();
  const posts = (payload.data ?? []).map((post) => ({
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

  if (posts.length > 0) {
    const { error } = await supabase.from("instagram_posts").upsert(posts, {
      onConflict: "media_id"
    });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
  }

  imported += posts.length;
  console.log(`Imported page ${page}: ${posts.length} posts`);

  nextUrl = payload.paging?.next ?? null;
  page += 1;
}

console.log(`Done. Imported or updated ${imported} Instagram posts.`);
