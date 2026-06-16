import { createClient } from "@supabase/supabase-js";
import { createServer } from "node:http";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function titleFor(video) {
  return video.title === "Untitled food video"
    ? "Saved food video"
    : video.title || "Saved food video";
}

function splitCategories(value) {
  return String(value ?? "")
    .split(",")
    .map((category) => category.trim())
    .filter(Boolean);
}

function videoChipLabel(video, index, count) {
  const label = video.dish_name?.trim();

  if (count > 1 && label) {
    return `Watch ${label}`;
  }

  return "Watch video";
}

function socialIcon(name) {
  const icons = {
    instagram:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1.2"></circle></svg>',
    tiktok:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v10.4a4.6 4.6 0 1 1-4.6-4.6"></path><path d="M14 3c.6 3 2.4 4.8 5 5"></path></svg>',
    youtube:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6.5" width="18" height="11" rx="3"></rect><path d="m10 9.5 5 2.5-5 2.5z"></path></svg>'
  };

  return icons[name] ?? "";
}

function socialLinks() {
  const links = [
    ["Instagram", "https://www.instagram.com/nick.rizzo.daily/", "instagram"],
    ["TikTok", "https://www.tiktok.com/@nick.rizzo.daily", "tiktok"],
    ["YouTube", "https://www.youtube.com/@nickrizzodaily", "youtube"]
  ];

  return links
    .map(
      ([label, href, icon]) => `
        <a class="social-link" href="${href}" target="_blank" rel="noreferrer" aria-label="${label}">
          ${socialIcon(icon)}
        </a>
      `
    )
    .join("");
}

function siteNav(active, { includeAdmin = false } = {}) {
  const items = [
    ["Food Tracker", "/", "food"],
    ["About Me", "/about", "about"],
    ...(includeAdmin
      ? [
          ["Review Queue", "/review", "review"],
          ["Manage Places", "/admin/places", "manage"]
        ]
      : [])
  ];

  return items
    .map(
      ([label, href, key]) =>
        `<a class="${active === key ? "active" : ""}" href="${href}">${label}</a>`
    )
    .join("");
}

function redirect(response, location) {
  response.writeHead(303, { Location: location });
  response.end();
}

async function parseForm(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const params = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  return Object.fromEntries(params.entries());
}

const env = loadLocalEnv();
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const readKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const writeKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const port = Number(process.env.PORT || 3000);

if (!supabaseUrl || !readKey || !writeKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY."
  );
}

const readSupabase = createClient(supabaseUrl, readKey, {
  auth: { persistSession: false }
});
const writeSupabase = createClient(supabaseUrl, writeKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function loadDirectoryPlaces() {
  const { data, error } = await readSupabase
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

  for (const video of data ?? []) {
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

  const { data: restaurants, error: restaurantError } = await readSupabase
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

async function loadPlace(id) {
  const { data, error } = await writeSupabase
    .from("restaurants")
    .select("id, name, slug, city, category:notes")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Unable to load place: ${error.message}`);
  }

  const { data: videos, error: videosError } = await writeSupabase
    .from("food_videos")
    .select("id, title, dish_name, permalink")
    .eq("restaurant_id", id)
    .order("published_at", { ascending: false });

  if (videosError) {
    throw new Error(`Unable to load place videos: ${videosError.message}`);
  }

  return { ...data, videos: videos ?? [] };
}

async function loadReviewVideos() {
  const { data, error } = await readSupabase
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

async function updatePlace(form) {
  const id = form.id?.trim();
  const name = form.name?.trim();
  const city = form.city?.trim() || "Seattle";
  const category = form.category?.trim() || null;

  if (!id || !name) {
    throw new Error("Place id and name are required.");
  }

  const slug = slugify([name, city].filter(Boolean).join(" "));

  const { error } = await writeSupabase
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

  const { error: videoError } = await writeSupabase
    .from("food_videos")
    .update({
      city,
      region: "WA"
    })
    .eq("restaurant_id", id);

  if (videoError) {
    throw new Error(`Unable to update linked videos: ${videoError.message}`);
  }

  const videoLabelUpdates = Object.entries(form)
    .filter(([key]) => key.startsWith("video_label_"))
    .map(([key, value]) => ({
      id: key.replace("video_label_", ""),
      label: value.trim() || null
    }))
    .filter((video) => video.id);

  for (const video of videoLabelUpdates) {
    const { error: labelError } = await writeSupabase
      .from("food_videos")
      .update({ dish_name: video.label })
      .eq("id", video.id)
      .eq("restaurant_id", id);

    if (labelError) {
      throw new Error(`Unable to update video label: ${labelError.message}`);
    }
  }
}

async function removeVideoFromPlace(form) {
  const placeId = form.place_id?.trim();
  const videoId = form.video_id?.trim();

  if (!placeId || !videoId) {
    throw new Error("Place id and video id are required.");
  }

  const { error } = await writeSupabase
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
}

async function savePlace(form) {
  const placeName = form.place_name?.trim();
  const videoId = form.video_id?.trim();

  if (!placeName || !videoId) {
    throw new Error("Name and video id are required.");
  }

  const city = form.city?.trim() || "Seattle";
  const category = form.category?.trim() || null;
  const videoLabel = form.video_label?.trim() || category;
  const slugBase = [placeName, city].filter(Boolean).join(" ");
  const slug = slugify(slugBase);

  const { data: restaurant, error: restaurantError } = await writeSupabase
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

  const { error: videoError } = await writeSupabase
    .from("food_videos")
    .update({
      restaurant_id: restaurant.id,
      dish_name: videoLabel,
      city,
      region: "WA",
      status: "published"
    })
    .eq("id", videoId);

  if (videoError) {
    throw new Error(`Unable to attach video to place: ${videoError.message}`);
  }
}

async function createManualPlace(form) {
  const placeName = form.place_name?.trim();

  if (!placeName) {
    throw new Error("Name is required.");
  }

  const city = form.city?.trim() || "Seattle";
  const category = form.category?.trim() || null;
  const videoUrl = form.video_url?.trim() || null;
  const slug = slugify([placeName, city].filter(Boolean).join(" "));

  const { data: restaurant, error } = await writeSupabase
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
    const { error: videoError } = await writeSupabase.from("food_videos").insert({
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
}

async function ignoreVideo(form) {
  const videoId = form.video_id?.trim();
  const mediaId = form.media_id?.trim();

  if (!videoId) {
    throw new Error("Video id is required.");
  }

  const { error: videoError } = await writeSupabase
    .from("food_videos")
    .update({ status: "archived" })
    .eq("id", videoId);

  if (videoError) {
    throw new Error(`Unable to ignore video: ${videoError.message}`);
  }

  if (mediaId) {
    const { error: postError } = await writeSupabase
      .from("instagram_posts")
      .update({ status: "Ignored" })
      .eq("media_id", mediaId);

    if (postError) {
      throw new Error(`Unable to ignore source post: ${postError.message}`);
    }
  }
}

function basePage({ eyebrow, title, count, nav, content, socials = "", showTitle = true }) {
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          --bg: #f6f2ea;
          --ink: #151515;
          --muted: #66625d;
          --panel: #fff;
          --line: #d8d1c4;
          --accent: #007f73;
          --accent-ink: #02433d;
          --rose: #c14f67;
          --gold: #c8912a;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: linear-gradient(135deg, rgba(0, 127, 115, .08), transparent 34%), var(--bg);
          color: var(--ink);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 40px 0 56px; }
        header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
        nav { display: flex; gap: 10px; margin-bottom: 28px; flex-wrap: wrap; }
        nav a, .button {
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #fff;
          color: var(--ink);
          cursor: pointer;
          display: inline-flex;
          font: inherit;
          font-weight: 800;
          min-height: 38px;
          align-items: center;
          padding: 0 12px;
          text-decoration: none;
        }
        nav a.active {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }
        .button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
        .button.danger { color: var(--rose); }
        .eyebrow { margin: 0 0 8px; color: var(--accent-ink); font-size: .78rem; font-weight: 800; text-transform: uppercase; }
        h1 { margin: 0; font-size: clamp(2.4rem, 7vw, 5.8rem); line-height: .95; }
        .count { color: var(--muted); font-weight: 700; }
        .empty { border: 1px dashed var(--line); border-radius: 8px; padding: 28px; background: rgba(255,255,255,.6); color: var(--muted); text-align: center; }
        .places { display: grid; gap: 22px; }
        .letter { color: var(--accent-ink); font-size: 1rem; margin: 0 0 8px; }
        .place-list { display: grid; gap: 10px; }
        .place {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--panel);
          padding: 16px;
        }
        .place h2, .review-card h2 { margin: 0; font-size: 1.1rem; line-height: 1.25; }
        .meta { color: var(--muted); font-size: .82rem; font-weight: 800; text-transform: uppercase; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .chip { background: #f4efe5; border: 1px solid var(--line); border-radius: 999px; color: #4d4944; font-size: .8rem; font-weight: 800; padding: 5px 9px; }
        .review-grid { display: grid; gap: 16px; }
        .review-card {
          display: grid;
          grid-template-columns: 170px 1fr;
          gap: 16px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--panel);
          padding: 12px;
        }
        .media { display: grid; aspect-ratio: 1 / 1; place-items: center; overflow: hidden; border-radius: 6px; background: #14213d; color: #fff; font-weight: 800; text-decoration: none; }
        .media img { width: 100%; height: 100%; display: block; object-fit: cover; }
        .body { display: grid; gap: 10px; }
        p { margin: 0; color: #2a2926; line-height: 1.5; }
        .link { color: var(--rose); font-weight: 800; text-decoration-thickness: 2px; text-underline-offset: 4px; }
        form { display: grid; gap: 10px; }
        .form-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; }
        label { display: grid; gap: 5px; color: var(--muted); font-size: .78rem; font-weight: 800; text-transform: uppercase; }
        input, select {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 8px;
          color: var(--ink);
          font: inherit;
          min-height: 42px;
          padding: 0 10px;
        }
        .filters {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 22px;
        }
        .letter-section[hidden], .place[hidden], .empty[hidden] { display: none; }
        .actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .edit-panel {
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--panel);
          padding: 16px;
        }
        .about {
          display: grid;
          gap: 18px;
          max-width: 760px;
        }
        .about-card {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 8px;
          display: grid;
          gap: 12px;
          padding: 18px;
        }
        .about-card h2 { font-size: 1.2rem; margin: 0; }
        .linked-videos { display: grid; gap: 10px; }
        .linked-video {
          border: 1px solid var(--line);
          border-radius: 8px;
          display: grid;
          gap: 10px;
          padding: 12px;
        }
        .linked-video-top {
          align-items: center;
          display: flex;
          gap: 10px;
          justify-content: space-between;
        }
        .linked-video-title { font-weight: 800; }
        .video-embed {
          aspect-ratio: 16 / 9;
          background: #151515;
          border: 1px solid var(--line);
          border-radius: 8px;
          overflow: hidden;
          width: 100%;
        }
        .video-embed iframe {
          border: 0;
          display: block;
          height: 100%;
          width: 100%;
        }
        .header-actions { display: grid; gap: 14px; justify-items: end; }
        .socials { display: flex; gap: 10px; }
        .social-link {
          align-items: center;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 999px;
          color: var(--ink);
          display: inline-flex;
          height: 44px;
          justify-content: center;
          text-decoration: none;
          width: 44px;
        }
        .social-link:hover {
          border-color: var(--accent);
          color: var(--accent-ink);
        }
        .social-link svg {
          fill: none;
          height: 22px;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2;
          width: 22px;
        }
        .social-link[aria-label="YouTube"] svg path { fill: currentColor; stroke-width: 0; }
        @media (max-width: 720px) {
          header { display: grid; align-items: start; }
          .header-actions { justify-items: start; }
          .review-card { grid-template-columns: 1fr; }
          .form-grid, .filters { grid-template-columns: 1fr; }
          .place { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <main>
        <header>
          <div>
            <p class="eyebrow">${escapeHtml(eyebrow)}</p>
            ${showTitle ? `<h1>${escapeHtml(title)}</h1>` : ""}
          </div>
          <div class="header-actions">
            ${count ? `<p class="count">${escapeHtml(count)}</p>` : ""}
            ${socials ? `<div class="socials" aria-label="Social links">${socials}</div>` : ""}
          </div>
        </header>
        <nav>${nav}</nav>
        ${content}
      </main>
    </body>
  </html>`;
}

function renderDirectory(places, { admin = false } = {}) {
  const cities = [
    ...new Set(places.map((place) => place.city).filter(Boolean))
  ].sort((a, b) => a.localeCompare(b));
  const categories = [
    ...new Set(places.flatMap((place) => splitCategories(place.category)))
  ].sort((a, b) => a.localeCompare(b));
  const grouped = new Map();

  for (const place of places) {
    const letter = place.name[0]?.toUpperCase() || "#";
    const bucket = grouped.get(letter) ?? [];
    bucket.push(place);
    grouped.set(letter, bucket);
  }

  const content =
    places.length === 0
      ? `<div class="empty">No mapped places yet. Use the review queue to attach videos to places.</div>`
      : `
        <section class="filters" aria-label="Directory filters">
          <label>Search<input id="place-search" type="search" placeholder="Search places"></label>
          <label>City
            <select id="city-filter">
              <option value="">All cities</option>
              ${cities
                .map((city) => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`)
                .join("")}
            </select>
          </label>
          <label>Category
            <select id="category-filter">
              <option value="">All categories</option>
              ${categories
                .map(
                  (category) =>
                    `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
                )
                .join("")}
            </select>
          </label>
        </section>
        <div id="filter-empty" class="empty" hidden>No places match those filters.</div>
        <section class="places">${[...grouped.entries()]
          .map(
            ([letter, bucket]) => `
              <section class="letter-section" data-letter="${escapeHtml(letter)}">
                <h2 class="letter">${escapeHtml(letter)}</h2>
                <div class="place-list">
                  ${bucket
                    .map(
                      (place) => {
                        const categoryList = splitCategories(place.category);

                        return `
                        <article
                          class="place"
                          data-name="${escapeHtml(place.name.toLowerCase())}"
                          data-city="${escapeHtml((place.city ?? "").toLowerCase())}"
                          data-categories="${escapeHtml(
                            categoryList.map((category) => category.toLowerCase()).join("|")
                          )}"
                        >
                          <div>
                            <h2>${escapeHtml(place.name)}</h2>
                            <div class="meta">${escapeHtml(
                              [place.city, place.category]
                                .filter(Boolean)
                                .join(", ") || "Location TBD"
                            )}</div>
                            <div class="chips">
                              ${
                                admin
                                  ? `<a class="chip" href="/places/edit?id=${escapeHtml(
                                      place.id
                                    )}">Edit</a>`
                                  : ""
                              }
                              ${place.videos
                                .slice(0, 4)
                                .map(
                                  (video, index) =>
                                    `<a class="chip" href="${escapeHtml(
                                      video.permalink
                                    )}" target="_blank" rel="noreferrer">${escapeHtml(
                                      videoChipLabel(video, index, place.videos.length)
                                    )}</a>`
                                )
                                .join("")}
                            </div>
                          </div>
                        </article>
                      `;
                      }
                    )
                    .join("")}
                </div>
              </section>
            `
          )
          .join("")}</section>
        <script>
          const search = document.getElementById("place-search");
          const city = document.getElementById("city-filter");
          const category = document.getElementById("category-filter");
          const cards = [...document.querySelectorAll(".place")];
          const sections = [...document.querySelectorAll(".letter-section")];
          const count = document.querySelector(".count");
          const empty = document.getElementById("filter-empty");

          function applyFilters() {
            const query = search.value.trim().toLowerCase();
            const cityValue = city.value.trim().toLowerCase();
            const categoryValue = category.value.trim().toLowerCase();
            let visible = 0;

            for (const card of cards) {
              const matchesSearch = !query || card.dataset.name.includes(query);
              const matchesCity = !cityValue || card.dataset.city === cityValue;
              const matchesCategory =
                !categoryValue ||
                card.dataset.categories.split("|").includes(categoryValue);
              const show = matchesSearch && matchesCity && matchesCategory;
              card.hidden = !show;
              if (show) visible += 1;
            }

            for (const section of sections) {
              const hasVisibleCard = [...section.querySelectorAll(".place")].some(
                (card) => !card.hidden
              );
              section.hidden = !hasVisibleCard;
            }

            empty.hidden = visible !== 0;
            count.textContent = visible + " place" + (visible === 1 ? "" : "s");
          }

          search.addEventListener("input", applyFilters);
          city.addEventListener("change", applyFilters);
          category.addEventListener("change", applyFilters);
        </script>
      `;

  return basePage({
    eyebrow: "Nick Rizzo Daily",
    title: "Food Tracker",
    count: `${places.length} places`,
    nav: admin ? siteNav("manage", { includeAdmin: true }) : siteNav("food"),
    content,
    socials: admin ? "" : socialLinks(),
    showTitle: false
  });
}

function renderAbout() {
  return basePage({
    eyebrow: "Nick Rizzo Daily",
    title: "About Me",
    count: "",
    nav: siteNav("about"),
    content: `
      <section class="about">
        <div class="about-card">
          <p>I'm Nick, a Seattle-based creator documenting food and daily life.</p>
          <p>After reviewing hundreds of restaurants on social media, I built this site to make those recommendations easier to explore.</p>
          <p>Think of it as a searchable archive of my food adventures—organized by location, cuisine, and category so you can find your next meal without digging through endless videos.</p>
        </div>
        <div class="video-embed">
          <iframe
            src="https://www.youtube.com/embed/4LIt-vYJRuo"
            title="About Nick Rizzo Daily"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen>
          </iframe>
        </div>
      </section>
    `,
    socials: socialLinks(),
    showTitle: false
  });
}

function renderEditPlace(place) {
  const videoFields = place.videos.length
    ? `
      <div class="body linked-videos">
        <div class="meta">Link overrides</div>
        ${place.videos
          .map(
            (video) => `
              <div class="linked-video">
                <div class="linked-video-top">
                  <a class="link linked-video-title" href="${escapeHtml(
                    video.permalink
                  )}" target="_blank" rel="noreferrer">${escapeHtml(titleFor(video))}</a>
                  <button
                    class="button danger"
                    type="submit"
                    form="remove-video-${escapeHtml(video.id)}"
                  >Remove from place</button>
                </div>
                <label>Override
                  <input name="video_label_${escapeHtml(video.id)}" value="${escapeHtml(
                    place.videos.length > 1 ? video.dish_name || "" : ""
                  )}" placeholder="Watch video">
                </label>
              </div>
            `
          )
          .join("")}
      </div>
    `
    : "";

  return basePage({
    eyebrow: "Edit directory entry",
    title: "Edit Place",
    count: place.name,
    nav: siteNav("manage", { includeAdmin: true }),
    content: `
      <section class="edit-panel">
        <form method="post" action="/places/edit">
          <input type="hidden" name="id" value="${escapeHtml(place.id)}">
          <div class="form-grid">
            <label>Name<input name="name" value="${escapeHtml(place.name)}" required></label>
            <label>City<input name="city" value="${escapeHtml(place.city || "Seattle")}"></label>
            <label>Category<input name="category" value="${escapeHtml(place.category || "")}" placeholder="Sandwich"></label>
          </div>
          ${videoFields}
          <div class="actions">
            <button class="button primary" type="submit">Save changes</button>
            <a class="button" href="/">Cancel</a>
          </div>
        </form>
        ${place.videos
          .map(
            (video) => `
              <form id="remove-video-${escapeHtml(
                video.id
              )}" method="post" action="/places/remove-video">
                <input type="hidden" name="place_id" value="${escapeHtml(place.id)}">
                <input type="hidden" name="video_id" value="${escapeHtml(video.id)}">
              </form>
            `
          )
          .join("")}
      </section>
    `
  });
}

function renderReview(videos) {
  const createEntry = `
    <section class="edit-panel">
      <form method="post" action="/review/create">
        <div class="form-grid">
          <label>Name<input name="place_name" placeholder="Ramen Danbo" required></label>
          <label>City<input name="city" value="Seattle"></label>
          <label>Category<input name="category" placeholder="Ramen"></label>
        </div>
        <label>Video link<input name="video_url" type="url" placeholder="https://www.youtube.com/shorts/..."></label>
        <div class="actions">
          <button class="button primary" type="submit">Create entry</button>
        </div>
      </form>
    </section>
  `;
  const cards =
    videos.length === 0
      ? `<div class="empty">Nothing left to map. Very tidy.</div>`
      : `<section class="review-grid">${videos
          .map((video) => {
            const image = video.thumbnail_url || video.media_url;
            const title = titleFor(video);

            return `
              <article class="review-card">
                <a class="media" href="${escapeHtml(
                  video.permalink
                )}" target="_blank" rel="noreferrer">
                  ${
                    image
                      ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">`
                      : "<span>Saved post</span>"
                  }
                </a>
                <div class="body">
                  <div class="meta">${escapeHtml(formatDate(video.published_at))}</div>
                  <h2>${escapeHtml(title)}</h2>
                  <p>${escapeHtml(video.caption || "No caption")}</p>
                  <a class="link" href="${escapeHtml(
                    video.permalink
                  )}" target="_blank" rel="noreferrer">Open video</a>
                  <form method="post" action="/review/save">
                    <input type="hidden" name="video_id" value="${escapeHtml(video.id)}">
                    <div class="form-grid">
                      <label>Name<input name="place_name" placeholder="Ramen Danbo" required></label>
                      <label>City<input name="city" value="Seattle"></label>
                      <label>Category<input name="category" placeholder="Ramen"></label>
                    </div>
                    <div class="actions">
                      <button class="button primary" type="submit">Save place</button>
                    </div>
                  </form>
                  <form method="post" action="/review/ignore">
                    <input type="hidden" name="video_id" value="${escapeHtml(video.id)}">
                    <input type="hidden" name="media_id" value="${escapeHtml(
                      video.instagram_media_id
                    )}">
                    <button class="button danger" type="submit">Ignore video</button>
                  </form>
                </div>
              </article>
            `;
          })
          .join("")}</section>`;

  return basePage({
    eyebrow: "Map videos to places",
    title: "Review Queue",
    count: `${videos.length} videos`,
    nav: siteNav("review", { includeAdmin: true }),
    content: `${createEntry}${cards}`
  });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "POST" && url.pathname === "/review/save") {
      await savePlace(await parseForm(request));
      redirect(response, "/review");
      return;
    }

    if (request.method === "POST" && url.pathname === "/review/create") {
      await createManualPlace(await parseForm(request));
      redirect(response, "/admin/places");
      return;
    }

    if (request.method === "POST" && url.pathname === "/places/edit") {
      await updatePlace(await parseForm(request));
      redirect(response, "/");
      return;
    }

    if (request.method === "POST" && url.pathname === "/places/remove-video") {
      const form = await parseForm(request);
      await removeVideoFromPlace(form);
      redirect(response, `/places/edit?id=${encodeURIComponent(form.place_id ?? "")}`);
      return;
    }

    if (request.method === "POST" && url.pathname === "/review/ignore") {
      await ignoreVideo(await parseForm(request));
      redirect(response, "/review");
      return;
    }

    if (request.method === "GET" && url.pathname === "/review") {
      const videos = await loadReviewVideos();
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderReview(videos));
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin/places") {
      const places = await loadDirectoryPlaces();
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderDirectory(places, { admin: true }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/about") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderAbout());
      return;
    }

    if (request.method === "GET" && url.pathname === "/places/edit") {
      const id = url.searchParams.get("id");

      if (!id) {
        throw new Error("Missing place id.");
      }

      const place = await loadPlace(id);
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderEditPlace(place));
      return;
    }

    const places = await loadDirectoryPlaces();
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(renderDirectory(places));
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error.message);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Preview server ready at http://127.0.0.1:${port}`);
});
