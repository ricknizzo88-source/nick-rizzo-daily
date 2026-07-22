import { createSupabaseAdminClient } from "@/lib/supabase-admin";

function emptyWhenMissing(error) {
  return error?.code === "42P01" || /does not exist|schema cache/i.test(error?.message);
}

export async function loadVideoEditorApplications() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("video_editor_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (emptyWhenMissing(error)) {
    return [];
  }

  if (error) {
    throw new Error(`Unable to load applications: ${error.message}`);
  }

  return data ?? [];
}
