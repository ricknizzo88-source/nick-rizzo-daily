"use client";

import { useState } from "react";
import { createCollaboration } from "@/app/actions";

export function CollaborationForm() {
  const [videoRows, setVideoRows] = useState([0]);

  return (
    <form action={createCollaboration}>
      <div className="form-grid">
        <label>
          Partner
          <input name="partner_name" placeholder="Brand or restaurant name" required />
        </label>
        <label>
          Date
          <input name="partnership_date" type="date" />
        </label>
      </div>

      <div className="body linked-videos">
        <div className="meta">Video links</div>
        {videoRows.map((row, index) => (
          <div className="linked-video" key={row}>
            <div className="form-grid">
              <label>
                Video name
                <input name="video_title" placeholder={`Video ${index + 1}`} />
              </label>
              <label>
                Video URL
                <input
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
          onClick={() => setVideoRows((rows) => [...rows, Date.now()])}
          type="button"
        >
          Add another video link
        </button>
        <button className="button primary" type="submit">
          Add partner
        </button>
      </div>
    </form>
  );
}
