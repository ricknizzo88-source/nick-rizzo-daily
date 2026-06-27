import { cookies } from "next/headers";
import { optIntoAnalytics, optOutOfAnalytics } from "@/app/actions";
import { PageShell } from "@/app/site-nav";

export const dynamic = "force-dynamic";

export default async function AnalyticsAdminPage() {
  const cookieStore = await cookies();
  const optedOut = cookieStore.get("nrd_analytics_opt_out")?.value === "1";

  return (
    <PageShell active="analytics-admin" eyebrow="Analytics" includeAdmin>
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
    </PageShell>
  );
}
