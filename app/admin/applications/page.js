import { PageShell } from "@/app/site-nav";
import { loadVideoEditorApplications } from "@/lib/applications";
import { loadWorkWithMeContent } from "@/lib/work-with-me";

export const dynamic = "force-dynamic";

const formatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

function Detail({ label, value, link = false }) {
  if (!value) {
    return null;
  }

  return (
    <div className="application-detail">
      <span>{label}</span>
      {link ? (
        <a className="link" href={value} rel="noreferrer" target="_blank">
          {value}
        </a>
      ) : (
        <p>{value}</p>
      )}
    </div>
  );
}

function responseValue(application, field) {
  return application.field_responses?.[field.id] ?? application[field.id];
}

export default async function ApplicationsPage() {
  const applications = await loadVideoEditorApplications();
  const content = await loadWorkWithMeContent({ admin: true });

  return (
    <PageShell
      active="applications-admin"
      count={`${applications.length} applications`}
      eyebrow="Video editor applications"
      includeAdmin
    >
      {applications.length === 0 ? (
        <div className="empty-state">No video editor applications yet.</div>
      ) : (
        <section className="application-list">
          {applications.map((application) => (
            <article className="application-card" key={application.id}>
              <div>
                <h2>{application.full_name}</h2>
                <div className="meta">
                  {formatter.format(new Date(application.created_at))}
                  {application.status ? ` / ${application.status}` : ""}
                </div>
              </div>
              <div className="application-grid">
                {content.fields.map((field) => (
                  <Detail
                    key={field.id}
                    label={field.label}
                    link={field.type === "url"}
                    value={responseValue(application, field)}
                  />
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </PageShell>
  );
}
