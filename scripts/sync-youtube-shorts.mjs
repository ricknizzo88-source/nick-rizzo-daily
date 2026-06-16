import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { processPendingPost } from "../lib/process-pending-post.js";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

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

function durationToSeconds(duration) {
  const match = duration.match(
    /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
  );

  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const [, days = 0, hours = 0, minutes = 0, seconds = 0] = match.map(
    (value) => Number(value || 0)
  );

  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

function bestThumbnail(thumbnails = {}) {
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    null
  );
}

function normalizeHandle(handle) {
  if (!handle) {
    throw new Error("Missing YOUTUBE_CHANNEL_HANDLE.");
  }

  return handle.startsWith("@") ? handle : `@${handle}`;
}

async function youtubeGet(path, params) {
  const url = new URL(`${YOUTUBE_API_BASE}/${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube API failed with ${response.status}: ${body}`);
  }

  return response.json();
}

async function getChannel({ apiKey, handle }) {
  const payload = await youtubeGet("channels", {
    part: "snippet,contentDetails",
    forHandle: normalizeHandle(handle),
    key: apiKey
  });

  const channel = payload.items?.[0];

  if (!channel) {
    throw new Error(`Could not find YouTube channel for handle ${handle}.`);
  }

  return {
    id: channel.id,
    title: channel.snippet?.title,
    uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads
  };
}

async function getUploadsPage({ apiKey, playlistId, pageToken }) {
  return youtubeGet("playlistItems", {
    part: "snippet,contentDetails",
    playlistId,
    maxResults: "50",
    pageToken,
    key: apiKey
  });
}

async function getPlaylistsPage({ apiKey, channelId, pageToken }) {
  return youtubeGet("playlists", {
    part: "snippet",
    channelId,
    maxResults: "50",
    pageToken,
    key: apiKey
  });
}

async function getPlaylistVideoIds({ apiKey, playlistId }) {
  let pageToken;
  const videoIds = [];

  do {
    const payload = await getUploadsPage({ apiKey, playlistId, pageToken });

    videoIds.push(
      ...(payload.items ?? [])
        .map((item) => item.contentDetails?.videoId)
        .filter(Boolean)
    );

    pageToken = payload.nextPageToken;
  } while (pageToken);

  return videoIds;
}

async function getPlaylistMap({ apiKey, channelId }) {
  let pageToken;
  const playlists = [];

  do {
    const payload = await getPlaylistsPage({ apiKey, channelId, pageToken });

    playlists.push(
      ...(payload.items ?? []).map((playlist) => ({
        id: playlist.id,
        title: playlist.snippet?.title ?? "Untitled playlist"
      }))
    );

    pageToken = payload.nextPageToken;
  } while (pageToken);

  const videoIdToPlaylists = new Map();

  for (const playlist of playlists) {
    const videoIds = await getPlaylistVideoIds({
      apiKey,
      playlistId: playlist.id
    });

    for (const videoId of videoIds) {
      const existing = videoIdToPlaylists.get(videoId) ?? [];
      existing.push(playlist.title);
      videoIdToPlaylists.set(videoId, existing);
    }
  }

  return videoIdToPlaylists;
}

async function getVideoDetails({ apiKey, videoIds }) {
  if (videoIds.length === 0) {
    return [];
  }

  const payload = await youtubeGet("videos", {
    part: "snippet,contentDetails",
    id: videoIds.join(","),
    key: apiKey
  });

  return payload.items ?? [];
}

const env = loadLocalEnv();
const apiKey = process.env.YOUTUBE_API_KEY || env.YOUTUBE_API_KEY;
const channelHandle =
  process.env.YOUTUBE_CHANNEL_HANDLE || env.YOUTUBE_CHANNEL_HANDLE;
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const maxPages = Number(process.env.YOUTUBE_IMPORT_MAX_PAGES || 20);
const maxShortSeconds = Number(process.env.YOUTUBE_SHORT_MAX_SECONDS || 65);
const reclassifyExisting = process.env.YOUTUBE_RECLASSIFY_EXISTING === "true";

if (!apiKey || !channelHandle || !supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing YOUTUBE_API_KEY, YOUTUBE_CHANNEL_HANDLE, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const channel = await getChannel({ apiKey, handle: channelHandle });

if (!channel.uploadsPlaylistId) {
  throw new Error(`Channel ${channel.title} has no uploads playlist.`);
}

const playlistMap = await getPlaylistMap({ apiKey, channelId: channel.id });

let pageToken;
let page = 0;
const videos = [];

do {
  page += 1;
  const pagePayload = await getUploadsPage({
    apiKey,
    playlistId: channel.uploadsPlaylistId,
    pageToken
  });
  const videoIds = (pagePayload.items ?? [])
    .map((item) => item.contentDetails?.videoId)
    .filter(Boolean);
  const details = await getVideoDetails({ apiKey, videoIds });

  videos.push(...details);
  pageToken = pagePayload.nextPageToken;
} while (pageToken && page < maxPages);

const shorts = videos
  .map((video) => ({
    ...video,
    durationSeconds: durationToSeconds(video.contentDetails?.duration ?? "")
  }))
  .filter((video) => video.durationSeconds <= maxShortSeconds);

const mediaIds = shorts.map((video) => `youtube_${video.id}`);
let existingMediaIds = new Set();
let existingRows = [];

if (mediaIds.length > 0) {
  const { data, error } = await supabase
    .from("instagram_posts")
    .select("*")
    .in("media_id", mediaIds);

  if (error) {
    throw new Error(`Unable to check existing YouTube rows: ${error.message}`);
  }

  existingRows = data ?? [];
  existingMediaIds = new Set(existingRows.map((row) => row.media_id));
}

const newRows = shorts
  .filter((video) => !existingMediaIds.has(`youtube_${video.id}`))
  .map((video) => {
    const title = video.snippet?.title ?? "Untitled YouTube Short";
    const description = video.snippet?.description ?? "";
    const caption = [title, description].filter(Boolean).join("\n\n");

    return {
      media_id: `youtube_${video.id}`,
      caption,
      permalink: `https://www.youtube.com/shorts/${video.id}`,
      thumbnail_url: bestThumbnail(video.snippet?.thumbnails),
      media_url: bestThumbnail(video.snippet?.thumbnails),
      media_type: "VIDEO",
      media_product_type: "YOUTUBE_SHORTS",
      status: "Pending",
      timestamp: video.snippet?.publishedAt ?? new Date().toISOString(),
      raw: {
        source: "youtube-data-api",
        platform: "youtube",
        channelId: channel.id,
        channelTitle: channel.title,
        videoId: video.id,
        youtubePlaylists: playlistMap.get(video.id) ?? [],
        duration: video.contentDetails?.duration,
        durationSeconds: video.durationSeconds,
        title,
        description
      }
    };
  });

let insertedRows = [];

if (newRows.length > 0) {
  const { data, error } = await supabase
    .from("instagram_posts")
    .insert(newRows)
    .select("*");

  if (error) {
    throw new Error(`Unable to insert YouTube Shorts: ${error.message}`);
  }

  insertedRows = data ?? [];
}

const existingRowsToReclassify = [];

if (reclassifyExisting && existingRows.length > 0) {
  for (const row of existingRows) {
    const videoId = row.media_id.replace(/^youtube_/, "");
    const { data, error } = await supabase
      .from("instagram_posts")
      .update({
        status: "Pending",
        raw: {
          ...(row.raw ?? {}),
          youtubePlaylists: playlistMap.get(videoId) ?? []
        }
      })
      .eq("id", row.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Unable to update existing YouTube row: ${error.message}`);
    }

    existingRowsToReclassify.push(data);
  }
}

const processed = [];

for (const post of [...insertedRows, ...existingRowsToReclassify]) {
  processed.push(await processPendingPost(supabase, post));
}

console.log(
  JSON.stringify(
    {
      channel: channel.title,
      fetchedVideos: videos.length,
      detectedShorts: shorts.length,
      inserted: insertedRows.length,
      reclassifiedExisting: existingRowsToReclassify.length,
      processed: processed.length,
      review: processed.filter((result) => result.status === "Processed")
        .length,
      ignored: processed.filter((result) => result.status === "Ignored")
        .length
    },
    null,
    2
  )
);
