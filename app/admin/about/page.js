import { updateAboutContent } from "@/app/actions";
import { PageShell } from "@/app/site-nav";
import { loadAboutContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function AdminAboutPage({ searchParams }) {
  const params = await searchParams;
  const content = await loadAboutContent({ admin: true });

  return (
    <PageShell
      active="about-admin"
      eyebrow="Edit About Me"
      includeAdmin
    >
      <section className="edit-panel">
        {params?.saved ? (
          <div className="success-state">About Me changes saved.</div>
        ) : null}
        {params?.error ? (
          <div className="error-state">{params.error}</div>
        ) : null}
        <form action={updateAboutContent}>
          <label>
            About text
            <textarea
              defaultValue={content.body}
              name="body"
              required
              rows={9}
            />
          </label>
          <div className="actions">
            <button className="button primary" type="submit">
              Save About Me
            </button>
            <a className="button" href="/about">
              View public page
            </a>
          </div>
        </form>
      </section>
    </PageShell>
  );
}
