import { submitVideoEditorApplication } from "@/app/actions";
import { PageShell } from "@/app/site-nav";

export const dynamic = "force-dynamic";

export default async function WorkWithMePage({ searchParams }) {
  const params = await searchParams;

  return (
    <PageShell active="work" socials>
      <section className="work-page">
        <div className="about-card">
          <h2 className="compact-title">Video Editor Application</h2>
          <p>
            I am looking for a video editor who understands short-form pacing,
            food content, daily life videos, and clean social-first storytelling.
          </p>
          <p>
            If you have examples of Reels, TikToks, Shorts, or creator-style
            edits, send them here and I will review them.
          </p>
        </div>

        <section className="edit-panel">
          {params?.submitted ? (
            <div className="success-state">
              Application submitted. Thank you for reaching out.
            </div>
          ) : null}
          {params?.error ? (
            <div className="error-state">{params.error}</div>
          ) : null}
          <form action={submitVideoEditorApplication}>
            <div className="form-grid">
              <label>
                Name
                <input name="full_name" required />
              </label>
              <label>
                Email
                <input name="email" required type="email" />
              </label>
              <label>
                Time zone
                <input name="timezone" placeholder="Pacific" />
              </label>
            </div>

            <label>
              Portfolio link
              <input
                name="portfolio_url"
                placeholder="Website, Google Drive, YouTube, TikTok, etc."
                required
                type="url"
              />
            </label>

            <label>
              Social links
              <textarea
                name="social_links"
                placeholder="Instagram, TikTok, YouTube, LinkedIn, etc."
                rows={3}
              />
            </label>

            <div className="form-grid">
              <label>
                Editing software
                <input name="editing_software" placeholder="Premiere, CapCut, etc." />
              </label>
              <label>
                Availability
                <input name="availability" placeholder="10 hrs/week" />
              </label>
              <label>
                Rate expectations
                <input name="rate_expectation" placeholder="$ per video or hour" />
              </label>
            </div>

            <label>
              Why would you be a good fit?
              <textarea name="fit_notes" rows={5} />
            </label>

            <label className="hidden-field">
              Website
              <input name="website" tabIndex={-1} />
            </label>

            <div className="actions">
              <button className="button primary" type="submit">
                Submit application
              </button>
            </div>
          </form>
        </section>
      </section>
    </PageShell>
  );
}
