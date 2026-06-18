import { notFound } from "next/navigation";
import { PageShell } from "@/app/site-nav";
import { deletePlace, removeVideoFromPlace, updatePlace } from "@/app/actions";
import { loadPlace } from "@/lib/directory";

export const dynamic = "force-dynamic";

function titleFor(video) {
  return video.title === "Untitled food video"
    ? "Saved food video"
    : video.title || "Saved food video";
}

export default async function EditPlacePage({ searchParams }) {
  const params = await searchParams;
  const id = params?.id;

  if (!id) {
    notFound();
  }

  const place = await loadPlace(id);

  return (
    <PageShell
      active="manage"
      count={place.name}
      eyebrow="Edit directory entry"
      includeAdmin
    >
      <section className="edit-panel">
        <form action={updatePlace}>
          <input name="id" type="hidden" value={place.id} />
          <div className="form-grid">
            <label>
              Name
              <input defaultValue={place.name} name="name" required />
            </label>
            <label>
              City
              <input defaultValue={place.city || "Seattle"} name="city" />
            </label>
            <label>
              Category
              <input
                defaultValue={place.category || ""}
                name="category"
                placeholder="Sandwich"
              />
            </label>
          </div>

          {place.videos.length ? (
            <div className="body linked-videos">
              <div className="meta">Link overrides</div>
              {place.videos.map((video) => (
                <div className="linked-video" key={video.id}>
                  <div className="linked-video-top">
                    <a
                      className="link linked-video-title"
                      href={video.permalink}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {titleFor(video)}
                    </a>
                    <button
                      className="button danger"
                      form={`remove-video-${video.id}`}
                      type="submit"
                    >
                      Remove from place
                    </button>
                  </div>
                  <label>
                    Override
                    <input
                      defaultValue={
                        place.videos.length > 1 ? video.dish_name || "" : ""
                      }
                      name={`video_label_${video.id}`}
                      placeholder="Watch video"
                    />
                  </label>
                </div>
              ))}
            </div>
          ) : null}

          <div className="actions">
            <button className="button primary" type="submit">
              Save changes
            </button>
            <a className="button" href="/admin/places">
              Cancel
            </a>
          </div>
        </form>
        {place.videos.map((video) => (
          <form
            action={removeVideoFromPlace}
            id={`remove-video-${video.id}`}
            key={video.id}
          >
            <input name="place_id" type="hidden" value={place.id} />
            <input name="video_id" type="hidden" value={video.id} />
          </form>
        ))}
        <form action={deletePlace} className="danger-zone">
          <input name="place_id" type="hidden" value={place.id} />
          <div>
            <h2>Remove place</h2>
            <p>
              This removes the place from Food Tracker and archives its linked
              videos.
            </p>
          </div>
          <label className="checkbox-label">
            <input name="confirm_delete" type="checkbox" />
            Yes, remove this place
          </label>
          <button className="button danger" type="submit">
            Remove place
          </button>
        </form>
      </section>
    </PageShell>
  );
}
