"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { splitCategories, videoChipLabel } from "@/lib/directory-utils";

function groupPlaces(places) {
  const grouped = new Map();

  for (const place of places) {
    const letter = place.name?.[0]?.toUpperCase() || "#";
    const bucket = grouped.get(letter) ?? [];
    bucket.push(place);
    grouped.set(letter, bucket);
  }

  return [...grouped.entries()];
}

export function DirectoryGrid({
  admin = false,
  emptyMessage = "No mapped places yet. Use the review queue to attach videos to places.",
  places
}) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");

  const cities = useMemo(
    () =>
      [...new Set(places.map((place) => place.city).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [places]
  );
  const categories = useMemo(
    () =>
      [...new Set(places.flatMap((place) => splitCategories(place.category)))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [places]
  );

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedCity = city.trim().toLowerCase();
    const normalizedCategory = category.trim().toLowerCase();

    return places.filter((place) => {
      const placeCategories = splitCategories(place.category).map((item) =>
        item.toLowerCase()
      );

      return (
        (!normalizedQuery ||
          place.name.toLowerCase().includes(normalizedQuery)) &&
        (!normalizedCity || (place.city ?? "").toLowerCase() === normalizedCity) &&
        (!normalizedCategory || placeCategories.includes(normalizedCategory))
      );
    });
  }, [category, city, places, query]);

  const grouped = groupPlaces(filteredPlaces);

  if (places.length === 0) {
    return (
      <div className="empty-state">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <section aria-label="Directory filters" className="filters">
        <label>
          Search
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search places"
            type="search"
            value={query}
          />
        </label>
        <label>
          City
          <select onChange={(event) => setCity(event.target.value)} value={city}>
            <option value="">All cities</option>
            {cities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </section>

      {filteredPlaces.length === 0 ? (
        <div className="empty-state">No places match those filters.</div>
      ) : (
        <section className="places">
          {grouped.map(([letter, bucket]) => (
            <section className="letter-section" key={letter}>
              <h2 className="letter">{letter}</h2>
              <div className="place-list">
                {bucket.map((place) => (
                  <article className="place" key={place.id}>
                    <div>
                      <h2>{place.name}</h2>
                      <div className="meta">
                        {[place.city, place.category].filter(Boolean).join(", ") ||
                          "Location TBD"}
                      </div>
                      <div className="chips">
                        {admin ? (
                          <Link className="chip" href={`/places/edit?id=${place.id}`}>
                            Edit
                          </Link>
                        ) : null}
                        {place.videos.slice(0, 4).map((video) => (
                          <a
                            className="chip"
                            href={video.permalink}
                            key={video.id}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {videoChipLabel(video, place.videos.length)}
                          </a>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </section>
      )}
    </>
  );
}
