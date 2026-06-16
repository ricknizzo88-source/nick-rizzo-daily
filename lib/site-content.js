import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseBrowserlessClient } from "@/lib/supabase";

export const DEFAULT_ABOUT_CONTENT = {
  body: [
    "I'm Nick, a Seattle-based creator documenting food and daily life.",
    "After reviewing hundreds of restaurants on social media, I built this site to make those recommendations easier to explore.",
    "Think of it as a searchable archive of my food adventures—organized by location, cuisine, and category so you can find your next meal without digging through endless videos."
  ].join("\n\n"),
  videoUrl: "https://www.youtube.com/watch?v=4LIt-vYJRuo"
};

export function youtubeEmbedUrl(value) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) {
        return `https://www.youtube.com${url.pathname}`;
      }

      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
  } catch {
    return raw;
  }

  return raw;
}

export function aboutParagraphs(body) {
  return String(body ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export async function loadAboutContent({ admin = false } = {}) {
  const supabase = admin
    ? createSupabaseAdminClient()
    : createSupabaseBrowserlessClient();

  if (!supabase) {
    return DEFAULT_ABOUT_CONTENT;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "about")
    .maybeSingle();

  if (error) {
    return DEFAULT_ABOUT_CONTENT;
  }

  return {
    ...DEFAULT_ABOUT_CONTENT,
    ...(data?.value ?? {})
  };
}
