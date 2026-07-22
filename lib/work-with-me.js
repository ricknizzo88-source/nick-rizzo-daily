import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseBrowserlessClient } from "@/lib/supabase";

export const WORK_FIELD_TYPES = ["text", "email", "url", "textarea"];

export const DEFAULT_WORK_WITH_ME_FIELDS = [
  {
    id: "full_name",
    label: "Name",
    type: "text",
    placeholder: "",
    required: true,
    locked: true
  },
  {
    id: "email",
    label: "Email",
    type: "email",
    placeholder: "",
    required: false,
    locked: true
  },
  {
    id: "timezone",
    label: "Time zone",
    type: "text",
    placeholder: "Pacific",
    required: false,
    locked: false
  },
  {
    id: "portfolio_url",
    label: "Portfolio link",
    type: "url",
    placeholder: "Website, Google Drive, YouTube, TikTok, etc.",
    required: false,
    locked: true
  },
  {
    id: "social_links",
    label: "Social links",
    type: "textarea",
    placeholder: "Instagram, TikTok, YouTube, LinkedIn, etc.",
    required: false,
    locked: true
  },
  {
    id: "editing_software",
    label: "Editing software",
    type: "text",
    placeholder: "Premiere, CapCut, etc.",
    required: false,
    locked: false
  },
  {
    id: "availability",
    label: "Availability",
    type: "text",
    placeholder: "10 hrs/week",
    required: false,
    locked: false
  },
  {
    id: "rate_expectation",
    label: "Rate expectations",
    type: "text",
    placeholder: "$ per video or hour",
    required: false,
    locked: false
  },
  {
    id: "fit_notes",
    label: "Why would you be a good fit?",
    type: "textarea",
    placeholder: "",
    required: false,
    locked: false
  }
];

export const DEFAULT_WORK_WITH_ME_CONTENT = {
  title: "Video Editor Application",
  description: [
    "I am looking for a video editor who understands short-form pacing, food content, daily life videos, and clean social-first storytelling.",
    "If you have examples of Reels, TikToks, Shorts, or creator-style edits, send them here and I will review them."
  ].join("\n\n"),
  fields: DEFAULT_WORK_WITH_ME_FIELDS
};

export function workFieldById(id) {
  return DEFAULT_WORK_WITH_ME_FIELDS.find((field) => field.id === id);
}

export function validWorkFieldId(id) {
  return /^[a-z0-9_]+$/.test(String(id ?? ""));
}

export function normalizeWorkField(field) {
  const defaultField = workFieldById(field?.id);
  const id = validWorkFieldId(field?.id) ? field.id : defaultField?.id;

  if (!id) {
    return null;
  }

  const locked = Boolean(defaultField?.locked || field?.locked);
  const type = WORK_FIELD_TYPES.includes(field?.type) ? field.type : "text";
  const label = String(field?.label ?? defaultField?.label ?? "").trim();

  if (!label) {
    return null;
  }

  return {
    id,
    label,
    type: defaultField?.locked ? defaultField.type : type,
    placeholder: String(field?.placeholder ?? defaultField?.placeholder ?? ""),
    required: defaultField?.locked
      ? Boolean(defaultField.required)
      : Boolean(field?.required),
    locked
  };
}

export function normalizeWorkWithMeContent(value) {
  const submittedFields = Array.isArray(value?.fields) ? value.fields : [];
  const fields = submittedFields.map(normalizeWorkField).filter(Boolean);
  const fieldIds = new Set(fields.map((field) => field.id));

  for (const defaultField of DEFAULT_WORK_WITH_ME_FIELDS) {
    if (defaultField.locked && !fieldIds.has(defaultField.id)) {
      fields.push(defaultField);
    }
  }

  return {
    title: String(value?.title ?? DEFAULT_WORK_WITH_ME_CONTENT.title).trim(),
    description: String(
      value?.description ?? DEFAULT_WORK_WITH_ME_CONTENT.description
    ).trim(),
    fields: fields.length ? fields : DEFAULT_WORK_WITH_ME_FIELDS
  };
}

export async function loadWorkWithMeContent({ admin = false } = {}) {
  let supabase;

  try {
    supabase =
      admin || process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseAdminClient()
        : createSupabaseBrowserlessClient();
  } catch {
    supabase = createSupabaseBrowserlessClient();
  }

  if (!supabase) {
    return DEFAULT_WORK_WITH_ME_CONTENT;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "work_with_me")
    .maybeSingle();

  if (error) {
    return DEFAULT_WORK_WITH_ME_CONTENT;
  }

  return normalizeWorkWithMeContent(data?.value ?? DEFAULT_WORK_WITH_ME_CONTENT);
}
