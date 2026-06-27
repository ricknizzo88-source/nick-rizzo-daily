import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const IGNORED_PREFIXES = ["/admin", "/review", "/places/edit", "/api"];

function isMissingTable(error) {
  return error?.code === "42P01" || /does not exist|schema cache/i.test(error?.message);
}

function adminAuthConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_TOKEN);
}

function shouldIgnorePath(path) {
  return IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = String(body.path ?? "/").trim() || "/";
    const referrer = body.referrer ? String(body.referrer).slice(0, 500) : null;
    const visitorId = body.visitorId
      ? String(body.visitorId).slice(0, 120)
      : null;
    const cookies = request.cookies;
    const optedOut = cookies.get("nrd_analytics_opt_out")?.value === "1";
    const adminToken = cookies.get("nrd_admin")?.value;
    const isAdmin =
      adminAuthConfigured() && adminToken === process.env.ADMIN_SESSION_TOKEN;

    if (optedOut || isAdmin || shouldIgnorePath(path)) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("site_page_views").insert({
      path: path.slice(0, 500),
      referrer,
      visitor_id: visitorId,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null
    });

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json({ ok: true, tracked: false });
      }

      throw new Error(`Unable to track page view: ${error.message}`);
    }

    return NextResponse.json({ ok: true, tracked: true });
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
