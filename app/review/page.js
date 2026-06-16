import { PageShell } from "@/app/site-nav";
import {
  createManualPlace,
  ignoreVideo,
  saveReviewPlace
} from "@/app/actions";
import { loadReviewVideos } from "@/lib/directory";

export const dynamic = "force-dynamic";

const formatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

function titleFor(video) {
  return video.title === "Untitled food video"
    ? "Saved food video"
    : video.title || "Saved food video";
}

export default async function ReviewPage() {
  const videos = await loadReviewVideos();

  return (
    <PageShell
      active="review"
      count={`${videos.length} videos`}
      eyebrow="Map videos to places"
      includeAdmin
    >
      <section className="edit-panel">
        <form action={createManualPlace}>
          <div className="form-grid">
            <label>
              Name
              <input name="place_name" placeholder="Ramen Danbo" required />
            </label>
            <label>
              City
              <input defaultValue="Seattle" name="city" />
            </label>
            <label>
              Category
              <input name="category" placeholder="Ramen" />
            </label>
          </div>
          <label>
            Video link
            <input
              name="video_url"
              placeholder="https://www.youtube.com/shorts/..."
              type="url"
            />
          </label>
          <div className="actions">
            <button className="button primary" type="submit">
              Create entry
            </button>
          </div>
        </form>
      </section>

      {videos.length === 0 ? (
        <div className="empty-state">Nothing left to map. Very tidy.</div>
      ) : (
        <section className="review-grid">
          {videos.map((video) => {
            const image = video.thumbnail_url || video.media_url;
            const title = titleFor(video);

            return (
              <article className="review-card" key={video.id}>
                <a
                  className="media"
                  href={video.permalink}
                  rel="noreferrer"
                  target="_blank"
                >
                  {image ? <img alt={title} src={image} /> : <span>Saved post</span>}
                </a>
                <div className="body">
                  <div className="meta">
                    {formatter.format(new Date(video.published_at))}
                  </div>
                  <h2>{title}</h2>
                  <p>{video.caption || "No caption"}</p>
                  <a
                    className="link"
                    href={video.permalink}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open video
                  </a>
                  <form action={saveReviewPlace}>
                    <input name="video_id" type="hidden" value={video.id} />
                    <div className="form-grid">
                      <label>
                        Name
                        <input name="place_name" placeholder="Ramen Danbo" required />
                      </label>
                      <label>
                        City
                        <input defaultValue="Seattle" name="city" />
                      </label>
                      <label>
                        Category
                        <input name="category" placeholder="Ramen" />
                      </label>
                    </div>
                    <div className="actions">
                      <button className="button primary" type="submit">
                        Save place
                      </button>
                    </div>
                  </form>
                  <form action={ignoreVideo}>
                    <input name="video_id" type="hidden" value={video.id} />
                    <input
                      name="media_id"
                      type="hidden"
                      value={video.instagram_media_id ?? ""}
                    />
                    <button className="button danger" type="submit">
                      Ignore video
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </PageShell>
  );
}
