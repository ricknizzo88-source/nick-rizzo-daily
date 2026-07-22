"use client";

import { useState } from "react";
import { updateWorkWithMeContent } from "@/app/actions";

const WORK_FIELD_TYPES = ["text", "email", "url", "textarea"];

function newField() {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: "New field",
    type: "text",
    placeholder: "",
    required: false,
    locked: false
  };
}

export function WorkWithMeEditor({ content }) {
  const [fields, setFields] = useState(content.fields);

  return (
    <form action={updateWorkWithMeContent}>
      <label>
        Title
        <input defaultValue={content.title} name="title" required />
      </label>
      <label>
        Description
        <textarea defaultValue={content.description} name="description" required />
      </label>

      <div className="field-builder">
        <div className="meta">Application fields</div>
        {fields.map((field) => (
          <div className="field-row" key={field.id}>
            <div className="linked-video-top">
              <div className="linked-video-title">{field.label}</div>
              {field.locked ? null : (
                <button
                  className="button danger"
                  onClick={() =>
                    setFields((current) =>
                      current.filter((item) => item.id !== field.id)
                    )
                  }
                  type="button"
                >
                  Remove
                </button>
              )}
            </div>
            <input name="field_id" type="hidden" value={field.id} />
            <div className="form-grid">
              <label>
                Label
                <input
                  defaultValue={field.label}
                  name={`field_label_${field.id}`}
                  required
                />
              </label>
              <label>
                Type
                <select
                  defaultValue={field.type}
                  disabled={field.locked}
                  name={`field_type_${field.id}`}
                >
                  {WORK_FIELD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {field.locked ? (
                  <input
                    name={`field_type_${field.id}`}
                    type="hidden"
                    value={field.type}
                  />
                ) : null}
              </label>
              <label>
                Placeholder
                <input
                  defaultValue={field.placeholder}
                  name={`field_placeholder_${field.id}`}
                />
              </label>
            </div>
            <label className="checkbox-label">
              <input
                defaultChecked={field.required}
                disabled={field.locked}
                name={`field_required_${field.id}`}
                type="checkbox"
              />
              Required
            </label>
          </div>
        ))}
      </div>

      <div className="actions">
        <button
          className="button"
          onClick={() => setFields((current) => [...current, newField()])}
          type="button"
        >
          Add field
        </button>
        <button className="button primary" type="submit">
          Save Work With Me
        </button>
        <a className="button" href="/work-with-me">
          View public page
        </a>
      </div>
    </form>
  );
}
