"use client";

import { useState } from "react";
import { createCollaboration, updateCollaboration } from "@/app/actions";

function partnershipYear(date) {
  if (!date) {
    return "";
  }

  return String(new Date(`${date}T00:00:00`).getFullYear());
}

function makeVideoRow(video, index) {
  return {
    id: video?.id ?? "",
    key: video?.id ?? `new-${index}`,
    title: video?.title ?? "",
    url: video?.url ?? ""
  };
}

export function CollaborationForm({ partner }) {
  const isEditing = Boolean(partner?.id);
  const [videoRows, setVideoRows] = useState(
    partner?.videos?.length
      ? partner.videos.map(makeVideoRow)
      : [makeVideoRow(null, 0)]
  );

  return (
    <form action={isEditing ? updateCollaboration : createCollaboration}>
      {isEditing ? (
        <input name="partner_id" type="hidden" value={partner.id} />
      ) : null}
      <div className="form-grid">
        <label>
          Partner
          <input
            defaultValue={partner?.partner_name ?? ""}
            name="partner_name"
            placeholder="Brand or restaurant name"
            required
          />
        </label>
        <label>
          Year
          <input
            defaultValue={partnershipYear(partner?.partnership_date)}
            inputMode="numeric"
            max="2100"
            min="2000"
            name="partnership_year"
            placeholder="2026"
            type="number"
          />
        </label>
      </div>

      <div className="body linked-videos">
        <div className="meta">Video links</div>
        {videoRows.map((row, index) => (
          <div className="linked-video" key={row.key}>
            <div className="linked-video-top">
              <div className="linked-video-title">Video {index + 1}</div>
              {videoRows.length > 1 ? (
                <button
                  className="button danger"
                  onClick={() =>
                    setVideoRows((rows) =>
                      rows.filter((video) => video.key !== row.key)
                    )
                  }
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <input name="video_id" type="hidden" value={row.id} />
            <div className="form-grid">
              <label>
                Video name
                <input
                  defaultValue={row.title}
                  name="video_title"
                  placeholder={`Video ${index + 1}`}
                />
              </label>
              <label>
                Video URL
                <input
                  defaultValue={row.url}
                  name="video_url"
                  placeholder="https://www.instagram.com/reel/..."
                  type="url"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="actions">
        <button
          className="button"
          onClick={() =>
            setVideoRows((rows) => [
              ...rows,
              makeVideoRow(null, `${Date.now()}-${rows.length}`)
            ])
          }
          type="button"
        >
          Add another video link
        </button>
        <button className="button primary" type="submit">
          {isEditing ? "Save partner" : "Add partner"}
        </button>
      </div>
    </form>
  );
}
