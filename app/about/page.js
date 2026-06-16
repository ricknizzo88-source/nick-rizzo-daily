import { PageShell } from "@/app/site-nav";

export default function AboutPage() {
  return (
    <PageShell active="about" socials>
      <section className="about">
        <div className="about-card">
          <p>I&apos;m Nick, a Seattle-based creator documenting food and daily life.</p>
          <p>
            After reviewing hundreds of restaurants on social media, I built this
            site to make those recommendations easier to explore.
          </p>
          <p>
            Think of it as a searchable archive of my food adventures&mdash;organized
            by location, cuisine, and category so you can find your next meal without
            digging through endless videos.
          </p>
        </div>
        <div className="video-embed">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            src="https://www.youtube.com/embed/4LIt-vYJRuo"
            title="About Nick Rizzo Daily"
          />
        </div>
      </section>
    </PageShell>
  );
}
