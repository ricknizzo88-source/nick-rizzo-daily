import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

function loadLocalEnv() {
  const path = new URL("../.env.local", import.meta.url);

  if (!existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .map((line) => line.match(/^([^#=]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), match[2].trim()])
  );
}

function videoIdFromUrl(value) {
  const url = new URL(value);

  if (url.pathname.startsWith("/shorts/")) {
    return url.pathname.split("/").filter(Boolean)[1];
  }

  if (url.hostname.includes("youtu.be")) {
    return url.pathname.split("/").filter(Boolean)[0];
  }

  return url.searchParams.get("v");
}

const url = process.argv[2];

if (!url) {
  console.error("Usage: node scripts/seed-youtube-short.mjs <youtube-url>");
  process.exit(1);
}

const videoId = videoIdFromUrl(url);

if (!videoId) {
  console.error("Expected a YouTube Shorts, youtu.be, or watch URL.");
  process.exit(1);
}

const env = loadLocalEnv();
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const permalink = `https://www.youtube.com/shorts/${videoId}`;
const oembedUrl = new URL("https://www.youtube.com/oembed");
oembedUrl.searchParams.set("url", permalink);
oembedUrl.searchParams.set("format", "json");

const response = await fetch(oembedUrl);

if (!response.ok) {
  throw new Error(`YouTube oEmbed failed with ${response.status}.`);
}

const metadata = await response.json();
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const { error } = await supabase.from("instagram_posts").upsert(
  {
    media_id: `youtube_${videoId}`,
    caption: metadata.title ?? null,
    permalink,
    thumbnail_url: metadata.thumbnail_url ?? null,
    media_url: metadata.thumbnail_url ?? null,
    media_type: "VIDEO",
    media_product_type: "YOUTUBE_SHORTS",
    status: "Pending",
    timestamp: new Date().toISOString(),
    raw: {
      source: "youtube-oembed",
      platform: "youtube",
      videoId,
      authorName: metadata.author_name,
      authorUrl: metadata.author_url,
      title: metadata.title
    }
  },
  {
    onConflict: "media_id"
  }
);

if (error) {
  throw new Error(`Unable to seed YouTube Short: ${error.message}`);
}

console.log(`Seeded YouTube Short: ${metadata.title}`);
