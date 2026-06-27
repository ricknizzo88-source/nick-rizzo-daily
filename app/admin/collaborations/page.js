import { CollaborationForm } from "@/app/admin/collaborations/collaboration-form";
import { PageShell } from "@/app/site-nav";
import { loadCollaborations } from "@/lib/collaborations";

export const dynamic = "force-dynamic";

const formatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

function formatDate(date) {
  if (!date) {
    return "Date TBD";
  }

  return formatter.format(new Date(`${date}T00:00:00`));
}

export default async function ManageCollaborationsPage() {
  const collaborations = await loadCollaborations({ admin: true });

  return (
    <PageShell
      active="collaborations-admin"
      count={`${collaborations.length} partners`}
      eyebrow="Manage collaborations"
      includeAdmin
    >
      <section className="edit-panel">
        <CollaborationForm />
      </section>

      {collaborations.length === 0 ? (
        <div className="empty-state">No collaborations added yet.</div>
      ) : (
        <section className="collaboration-list">
          {collaborations.map((partner) => (
            <article className="collaboration-card" key={partner.id}>
              <div>
                <h2>{partner.partner_name}</h2>
                <div className="meta">
                  {formatDate(partner.partnership_date)}
                  {partner.is_published ? "" : " / Hidden"}
                </div>
              </div>
              {partner.videos.length ? (
                <div className="chips">
                  {partner.videos.map((video) => (
                    <a
                      className="chip"
                      href={video.url}
                      key={video.id}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {video.title}
                    </a>
                  ))}
                </div>
              ) : (
                <p>No video links yet.</p>
              )}
            </article>
          ))}
        </section>
      )}
    </PageShell>
  );
}
