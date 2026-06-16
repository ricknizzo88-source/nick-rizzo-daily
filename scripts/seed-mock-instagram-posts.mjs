import { createClient } from "@supabase/supabase-js";

const env = await import("node:fs").then(({ readFileSync, existsSync }) => {
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
});

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

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const now = new Date();

const mockPosts = [
  {
    media_id: "mock_reel_tacos_001",
    caption:
      "Crispy fish tacos with salsa verde in San Diego\n#tacos #seafood #sandiego #lunch",
    permalink: "https://www.instagram.com/reel/mock-tacos/",
    thumbnail_url:
      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=80",
    media_url:
      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=80",
    media_type: "VIDEO",
    media_product_type: "REELS",
    status: "Pending",
    timestamp: now.toISOString(),
    raw: { source: "mock-seed" }
  },
  {
    media_id: "mock_reel_ramen_002",
    caption:
      "Late-night spicy miso ramen with charred corn\n#ramen #japanese #datenight",
    permalink: "https://www.instagram.com/reel/mock-ramen/",
    thumbnail_url:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
    media_url:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
    media_type: "VIDEO",
    media_product_type: "REELS",
    status: "Pending",
    timestamp: new Date(now.getTime() - 86400000).toISOString(),
    raw: { source: "mock-seed" }
  },
  {
    media_id: "mock_reel_pastry_003",
    caption:
      "Flaky pistachio croissant worth crossing town for\n#bakery #pastry #brunch",
    permalink: "https://www.instagram.com/reel/mock-pastry/",
    thumbnail_url:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80",
    media_url:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80",
    media_type: "VIDEO",
    media_product_type: "REELS",
    status: "Pending",
    timestamp: new Date(now.getTime() - 172800000).toISOString(),
    raw: { source: "mock-seed" }
  }
];

const { error } = await supabase.from("instagram_posts").upsert(mockPosts, {
  onConflict: "media_id"
});

if (error) {
  throw new Error(`Unable to seed mock posts: ${error.message}`);
}

console.log(`Seeded ${mockPosts.length} mock pending Instagram posts.`);
