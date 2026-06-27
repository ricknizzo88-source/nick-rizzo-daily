import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const MAX_ROWS = 10000;

function isMissingTable(error) {
  return error?.code === "42P01" || /does not exist|schema cache/i.test(error?.message);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function countSince(rows, date) {
  const timestamp = date.getTime();
  return rows.filter((row) => new Date(row.created_at).getTime() >= timestamp)
    .length;
}

function uniqueVisitors(rows) {
  return new Set(rows.map((row) => row.visitor_id).filter(Boolean)).size;
}

function topPages(rows) {
  const counts = new Map();

  for (const row of rows) {
    counts.set(row.path, (counts.get(row.path) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views || a.path.localeCompare(b.path))
    .slice(0, 8);
}

export async function loadSiteAnalytics() {
  const supabase = createSupabaseAdminClient();
  const { data, error, count } = await supabase
    .from("site_page_views")
    .select("path, visitor_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (isMissingTable(error)) {
    return {
      hasTable: false,
      totalViews: 0,
      uniqueVisitors: 0,
      todayViews: 0,
      sevenDayViews: 0,
      thirtyDayViews: 0,
      topPages: []
    };
  }

  if (error) {
    throw new Error(`Unable to load site analytics: ${error.message}`);
  }

  const rows = data ?? [];

  return {
    hasTable: true,
    totalViews: count ?? rows.length,
    uniqueVisitors: uniqueVisitors(rows),
    todayViews: countSince(rows, startOfToday()),
    sevenDayViews: countSince(rows, daysAgo(7)),
    thirtyDayViews: countSince(rows, daysAgo(30)),
    topPages: topPages(rows)
  };
}
