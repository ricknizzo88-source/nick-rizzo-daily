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

function shortcodeFromUrl(value) {
  const url = new URL(value);
  const match = url.pathname.match(/\/(?:p|reel|tv)\/([^/]+)/);

  if (!match?.[1]) {
    throw new Error("Expected an Instagram post, reel, or tv URL.");
  }

  return match[1];
}

const url = process.argv[2];
const caption = process.argv[3] || null;
const thumbnailUrl = process.argv[4] || null;

if (!url) {
  console.error(
    "Usage: node scripts/seed-instagram-url.mjs <instagram-url> [caption] [thumbnail-url]"
  );
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

const shortcode = shortcodeFromUrl(url);
const permalink = `https://www.instagram.com/p/${shortcode}/`;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const { error } = await supabase.from("instagram_posts").upsert(
  {
    media_id: `instagram_shortcode_${shortcode}`,
    caption,
    permalink,
    thumbnail_url: thumbnailUrl,
    media_url: thumbnailUrl,
    media_type: "UNKNOWN",
    media_product_type: "MANUAL",
    status: "Pending",
    timestamp: new Date().toISOString(),
    raw: {
      source: "manual-url-seed",
      shortcode,
      url
    }
  },
  {
    onConflict: "media_id"
  }
);

if (error) {
  throw new Error(`Unable to seed Instagram URL: ${error.message}`);
}

console.log(`Seeded real Instagram URL: ${permalink}`);
