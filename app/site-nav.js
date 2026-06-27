import Link from "next/link";

export function SiteNav({ active, includeAdmin = false }) {
  const items = [
    ["Food Tracker", "/", "food"],
    ["Brand Partnerships", "/collaborations", "collaborations"],
    ["About Me", "/about", "about"],
    ...(includeAdmin
      ? [
          ["Review Queue", "/review", "review"],
          ["Manage Places", "/admin/places", "manage"],
          ["Hidden", "/admin/hidden", "hidden"],
          [
            "Manage Partnerships",
            "/admin/collaborations",
            "collaborations-admin"
          ],
          ["Edit About", "/admin/about", "about-admin"]
        ]
      : [])
  ];

  return (
    <nav>
      {items.map(([label, href, key]) => (
        <Link className={active === key ? "active" : ""} href={href} key={key}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function SocialIcon({ name }) {
  if (name === "instagram") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect height="18" rx="5" width="18" x="3" y="3" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1.2" />
      </svg>
    );
  }

  if (name === "tiktok") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M14 3v10.4a4.6 4.6 0 1 1-4.6-4.6" />
        <path d="M14 3c.6 3 2.4 4.8 5 5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="11" rx="3" width="18" x="3" y="6.5" />
      <path d="m10 9.5 5 2.5-5 2.5z" />
    </svg>
  );
}

export function SocialLinks() {
  const links = [
    ["Instagram", "https://www.instagram.com/nick.rizzo.daily/", "instagram"],
    ["TikTok", "https://www.tiktok.com/@nick.rizzo.daily", "tiktok"],
    ["YouTube", "https://www.youtube.com/@nickrizzodaily", "youtube"]
  ];

  return (
    <div aria-label="Social links" className="socials">
      {links.map(([label, href, icon]) => (
        <a
          aria-label={label}
          className="social-link"
          href={href}
          key={label}
          rel="noreferrer"
          target="_blank"
        >
          <SocialIcon name={icon} />
        </a>
      ))}
    </div>
  );
}

export function PageShell({
  active,
  children,
  count,
  eyebrow = "Nick Rizzo Daily",
  includeAdmin = false,
  socials = false
}) {
  return (
    <main className="page-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">{eyebrow}</p>
        </div>
        <div className="header-actions">
          {count ? <p className="count">{count}</p> : null}
          {socials ? <SocialLinks /> : null}
        </div>
      </header>
      <SiteNav active={active} includeAdmin={includeAdmin} />
      {children}
    </main>
  );
}
