import { submitVideoEditorApplication } from "@/app/actions";
import { PageShell } from "@/app/site-nav";
import { aboutParagraphs } from "@/lib/site-content";
import { loadWorkWithMeContent } from "@/lib/work-with-me";

export const dynamic = "force-dynamic";

export default async function WorkWithMePage({ searchParams }) {
  const params = await searchParams;
  const content = await loadWorkWithMeContent();

  return (
    <PageShell active="work" socials>
      <section className="work-page">
        <div className="about-card">
          <h2 className="compact-title">{content.title}</h2>
          {aboutParagraphs(content.description).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
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
            <div className="work-form-fields">
              {content.fields.map((field) => (
                <label key={field.id}>
                  {field.label}
                  {field.type === "textarea" ? (
                    <textarea
                      name={field.id}
                      placeholder={field.placeholder}
                      required={field.required}
                      rows={field.id === "fit_notes" ? 5 : 3}
                    />
                  ) : (
                    <input
                      inputMode={field.type === "url" ? "url" : undefined}
                      name={field.id}
                      placeholder={field.placeholder}
                      required={field.required}
                      type={field.type === "url" ? "text" : field.type}
                    />
                  )}
                </label>
              ))}
            </div>
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
