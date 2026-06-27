import { cookies } from "next/headers";
import { optIntoAnalytics, optOutOfAnalytics } from "@/app/actions";
import { PageShell } from "@/app/site-nav";
import { loadSiteAnalytics } from "@/lib/site-analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsAdminPage() {
  const cookieStore = await cookies();
  const optedOut = cookieStore.get("nrd_analytics_opt_out")?.value === "1";
  const stats = await loadSiteAnalytics();

  return (
    <PageShell active="analytics-admin" eyebrow="Analytics" includeAdmin>
      <section className="analytics-grid">
        <div className="analytics-card">
          <div className="meta">Total clean page views</div>
          <strong>{stats.totalViews}</strong>
        </div>
        <div className="analytics-card">
          <div className="meta">Unique visitors</div>
          <strong>{stats.uniqueVisitors}</strong>
        </div>
        <div className="analytics-card">
          <div className="meta">Today</div>
          <strong>{stats.todayViews}</strong>
        </div>
        <div className="analytics-card">
          <div className="meta">Last 7 days</div>
          <strong>{stats.sevenDayViews}</strong>
        </div>
        <div className="analytics-card">
          <div className="meta">Last 30 days</div>
          <strong>{stats.thirtyDayViews}</strong>
        </div>
      </section>

      <section className="edit-panel">
        <h2 className="compact-title">Your browser tracking</h2>
        <p>
          {optedOut
            ? "Your visits are not being sent to Vercel Analytics from this browser."
            : "Your visits are currently counted in Vercel Analytics from this browser."}
        </p>
        <div className="actions">
          {optedOut ? (
            <form action={optIntoAnalytics}>
              <button className="button" type="submit">
                Count my visits again
              </button>
            </form>
          ) : (
            <form action={optOutOfAnalytics}>
              <button className="button primary" type="submit">
                Stop counting my visits
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="edit-panel">
        <h2 className="compact-title">Top pages</h2>
        {!stats.hasTable ? (
          <p>Run the latest Supabase SQL migration to start collecting clean analytics.</p>
        ) : stats.topPages.length === 0 ? (
          <p>No clean page views tracked yet.</p>
        ) : (
          <div className="analytics-table">
            {stats.topPages.map((page) => (
              <div className="analytics-row" key={page.path}>
                <span>{page.path}</span>
                <strong>{page.views}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
