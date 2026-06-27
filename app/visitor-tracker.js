"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function visitorId() {
  const key = "nrd_visitor_id";
  const existing = window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const id = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  window.localStorage.setItem(key, id);
  return id;
}

export function VisitorTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const query = searchParams?.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    const body = JSON.stringify({
      path,
      referrer: document.referrer || null,
      visitorId: visitorId()
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track-view",
        new Blob([body], { type: "application/json" })
      );
      return;
    }

    fetch("/api/track-view", {
      body,
      headers: {
        "Content-Type": "application/json"
      },
      keepalive: true,
      method: "POST"
    }).catch(() => {});
  }, [pathname, searchParams]);

  return null;
}
