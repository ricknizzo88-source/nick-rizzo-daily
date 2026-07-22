import { PageShell } from "@/app/site-nav";
import { loadVideoEditorApplications } from "@/lib/applications";

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

export default async function ApplicationsPage() {
  const applications = await loadVideoEditorApplications();

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
                <Detail label="Email" value={application.email} />
                <Detail label="Time zone" value={application.timezone} />
                <Detail
                  label="Portfolio"
                  link
                  value={application.portfolio_url}
                />
                <Detail label="Social links" value={application.social_links} />
                <Detail
                  label="Editing software"
                  value={application.editing_software}
                />
                <Detail label="Availability" value={application.availability} />
                <Detail
                  label="Rate expectations"
                  value={application.rate_expectation}
                />
                <Detail label="Fit notes" value={application.fit_notes} />
              </div>
            </article>
          ))}
        </section>
      )}
    </PageShell>
  );
}
