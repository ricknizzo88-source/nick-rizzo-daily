import { PageShell } from "@/app/site-nav";
import { aboutParagraphs, loadAboutContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const content = await loadAboutContent();

  return (
    <PageShell active="about" socials>
      <section className="about">
        <div className="about-card">
          {aboutParagraphs(content.body).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
