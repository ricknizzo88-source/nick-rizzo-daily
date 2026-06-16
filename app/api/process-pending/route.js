import { NextResponse } from "next/server";
import { processPendingPost } from "@/lib/process-pending-post";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Number(body.limit ?? 10);
    const supabase = createSupabaseAdminClient();

    const { data: pendingPosts, error } = await supabase
      .from("instagram_posts")
      .select("*")
      .eq("status", "Pending")
      .order("timestamp", { ascending: false })
      .limit(Number.isFinite(limit) ? limit : 10);

    if (error) {
      throw new Error(`Unable to load pending posts: ${error.message}`);
    }

    const processed = [];

    for (const post of pendingPosts ?? []) {
      processed.push(await processPendingPost(supabase, post));
    }

    return NextResponse.json({
      ok: true,
      found: pendingPosts?.length ?? 0,
      processed: processed.length,
      results: processed
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
