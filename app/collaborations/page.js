import { PageShell } from "@/app/site-nav";
import { loadCollaborations } from "@/lib/collaborations";

export const dynamic = "force-dynamic";

function formatYear(date) {
  if (!date) {
    return "Year TBD";
  }

  return new Date(`${date}T00:00:00`).getFullYear();
}

export default async function CollaborationsPage() {
  const collaborations = await loadCollaborations();
  const videoCount = collaborations.reduce(
    (total, partner) => total + partner.videos.length,
    0
  );

  return (
    <PageShell
      active="collaborations"
      count={`${videoCount} videos`}
      socials
    >
      {collaborations.length === 0 ? (
        <div className="empty-state">No brand partnerships added yet.</div>
      ) : (
        <section className="collaboration-list">
          {collaborations.map((partner) => (
            <article className="collaboration-card" key={partner.id}>
              <div>
                <h2>{partner.partner_name}</h2>
                <div className="meta">
                  {formatYear(partner.partnership_date)}
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
                <p>Video links coming soon.</p>
              )}
            </article>
          ))}
        </section>
      )}
    </PageShell>
  );
}
