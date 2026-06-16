"use client";

import { useMemo, useState } from "react";

const formatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

export function PostsGrid({ posts }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredPosts = useMemo(() => {
    if (!normalizedQuery) {
      return posts;
    }

    return posts.filter((post) => {
      const searchable = [
        post.caption,
        post.instagram_media_id,
        post.title,
        post.dish_name,
        post.status,
        post.media_type,
        post.permalink,
        post.published_at,
        post.neighborhood,
        post.city,
        post.region
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [normalizedQuery, posts]);

  return (
    <section className="posts-section">
      <label className="search-label" htmlFor="post-search">
        Search posts
      </label>
      <input
        id="post-search"
        className="search-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search captions, media ids, links, or dates"
        type="search"
      />

      {filteredPosts.length === 0 ? (
        <div className="empty-state">No posts match that search.</div>
      ) : (
        <div className="post-grid">
          {filteredPosts.map((post) => (
            <article className="post-card" key={post.instagram_media_id}>
              <a
                className="post-media"
                href={post.permalink}
                rel="noreferrer"
                target="_blank"
              >
                {post.thumbnail_url || post.media_url ? (
                  <img
                    alt={
                      post.title ||
                      post.caption ||
                      `Instagram video ${post.instagram_media_id}`
                    }
                    src={post.thumbnail_url || post.media_url}
                  />
                ) : (
                  <span>Instagram post</span>
                )}
              </a>

              <div className="post-content">
                <div className="post-meta">
                  <span>{formatter.format(new Date(post.published_at))}</span>
                  <span>{post.status || "review"}</span>
                </div>
                <h2>
                  {post.title === "Untitled food video"
                    ? "Saved Instagram food post"
                    : post.title || post.dish_name || "Saved Instagram food post"}
                </h2>
                {post.city || post.neighborhood ? (
                  <div className="post-location">
                    {[post.neighborhood, post.city, post.region]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                ) : null}
                <p>{post.caption || "No caption"}</p>
                <a
                  className="post-link"
                  href={post.permalink}
                  rel="noreferrer"
                  target="_blank"
                >
                  View on Instagram
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
