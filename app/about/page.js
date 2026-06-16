import { PageShell } from "@/app/site-nav";
import {
  aboutParagraphs,
  aboutVideoUrls,
  loadAboutContent,
  youtubeEmbedUrl
} from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const content = await loadAboutContent();
  const embedUrls = aboutVideoUrls(content)
    .map((url) => youtubeEmbedUrl(url))
    .filter(Boolean);

  return (
    <PageShell active="about" socials>
      <section className="about">
        <div className="about-card">
          {aboutParagraphs(content.body).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        {embedUrls.map((embedUrl, index) => (
          <div className="video-embed" key={embedUrl}>
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              src={embedUrl}
              title={`About Nick Rizzo Daily video ${index + 1}`}
            />
          </div>
        ))}
      </section>
    </PageShell>
  );
}
