import { PageShell, SocialIcon } from "@/app/site-nav";
import { aboutParagraphs, loadAboutContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

const socialLinks = [
  ["Instagram", "https://www.instagram.com/nick.rizzo.daily/", "instagram"],
  ["TikTok", "https://www.tiktok.com/@nick.rizzo.daily", "tiktok"],
  ["YouTube", "https://www.youtube.com/@nickrizzodaily", "youtube"]
];

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
        <div aria-label="Follow Nick Rizzo Daily" className="about-socials">
          {socialLinks.map(([label, href, icon]) => (
            <a
              aria-label={label}
              className="about-social-link"
              href={href}
              key={label}
              rel="noreferrer"
              target="_blank"
            >
              <SocialIcon name={icon} />
              <span>{label}</span>
            </a>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
