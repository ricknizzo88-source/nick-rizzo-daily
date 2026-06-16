import { PageShell } from "@/app/site-nav";
import {
  aboutParagraphs,
  loadAboutContent,
  youtubeEmbedUrl
} from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const content = await loadAboutContent();
  const embedUrl = youtubeEmbedUrl(content.videoUrl);

  return (
    <PageShell active="about" socials>
      <section className="about">
        <div className="about-card">
          {aboutParagraphs(content.body).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        {embedUrl ? (
          <div className="video-embed">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              src={embedUrl}
              title="About Nick Rizzo Daily"
            />
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}
