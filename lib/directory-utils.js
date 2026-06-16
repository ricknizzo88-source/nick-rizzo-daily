export function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function splitCategories(value) {
  return String(value ?? "")
    .split(",")
    .map((category) => category.trim())
    .filter(Boolean);
}

export function videoChipLabel(video, count) {
  const label = video.dish_name?.trim();

  if (count > 1 && label) {
    return `Watch ${label}`;
  }

  return "Watch video";
}
