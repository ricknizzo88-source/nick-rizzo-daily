import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseBrowserlessClient } from "@/lib/supabase";

function emptyWhenMissing(error) {
  if (!error) {
    return false;
  }

  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message);
}

export async function loadCollaborations({ admin = false } = {}) {
  const supabase = admin
    ? createSupabaseAdminClient()
    : createSupabaseBrowserlessClient();

  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("collaboration_partners")
    .select("id, partner_name, partnership_date, is_published")
    .order("partnership_date", { ascending: false })
    .order("partner_name", { ascending: true });

  if (!admin) {
    query = query.eq("is_published", true);
  }

  const { data: partners, error } = await query;

  if (emptyWhenMissing(error)) {
    return [];
  }

  if (error) {
    throw new Error(`Unable to load collaborations: ${error.message}`);
  }

  const partnerIds = (partners ?? []).map((partner) => partner.id);

  if (partnerIds.length === 0) {
    return [];
  }

  const { data: videos, error: videoError } = await supabase
    .from("collaboration_videos")
    .select("id, partner_id, title, url, sort_order")
    .in("partner_id", partnerIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (emptyWhenMissing(videoError)) {
    return (partners ?? []).map((partner) => ({ ...partner, videos: [] }));
  }

  if (videoError) {
    throw new Error(`Unable to load collaboration videos: ${videoError.message}`);
  }

  const videosByPartner = new Map();

  for (const video of videos ?? []) {
    const bucket = videosByPartner.get(video.partner_id) ?? [];
    bucket.push(video);
    videosByPartner.set(video.partner_id, bucket);
  }

  return (partners ?? []).map((partner) => ({
    ...partner,
    videos: videosByPartner.get(partner.id) ?? []
  }));
}
