function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromCaption(caption) {
  const firstLine = caption?.split("\n").find((line) => line.trim());

  if (!firstLine) {
    return "Untitled food video";
  }

  return firstLine.replace(/#\w+/g, "").trim().slice(0, 90);
}

function tagsFromCaption(caption) {
  const matches = caption?.match(/#[a-z0-9_]+/gi) ?? [];

  return [...new Set(matches)]
    .map((tag) => tag.slice(1).replace(/_/g, " ").trim())
    .filter(Boolean)
    .slice(0, 10);
}

const FOOD_SIGNALS = [
  "restaurant",
  "food",
  "eat",
  "eats",
  "dinner",
  "lunch",
  "brunch",
  "breakfast",
  "dessert",
  "menu",
  "chef",
  "kitchen",
  "cafe",
  "coffee",
  "bakery",
  "bar",
  "cocktail",
  "pizza",
  "pasta",
  "burger",
  "sandwich",
  "taco",
  "tacos",
  "ramen",
  "sushi",
  "noodles",
  "dumplings",
  "steak",
  "chicken",
  "seafood",
  "fish",
  "bbq",
  "burrito",
  "salad",
  "soup",
  "curry",
  "rice",
  "croissant",
  "pastry",
  "ice cream",
  "wine",
  "happy hour",
  "must try",
  "best bite",
  "hidden gem",
  "foodie",
  "foodtok",
  "foodstagram"
];

const NON_FOOD_SIGNALS = [
  "day in my life",
  "dayinmylife",
  "ditl",
  "living alone",
  "working in tech",
  "single",
  "dating",
  "get ready with me",
  "grwm",
  "outfit",
  "ootd",
  "makeup",
  "skincare",
  "gym",
  "workout",
  "vlog",
  "travel vlog",
  "pov",
  "latte art",
  "latte art with me",
  "pour latte",
  "pouring latte",
  "pouring coffee",
  "pour coffee",
  "coffee with me",
  "make coffee with me",
  "make a latte",
  "make latte",
  "top 3",
  "top 5",
  "top 10",
  "ranking",
  "30 year old",
  "31 year old",
  "morning routine",
  "night routine"
];

function normalizedCaption(caption) {
  return (caption ?? "")
    .toLowerCase()
    .replace(/[_#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasSignal(text, signal) {
  if (signal.includes(" ")) {
    return text.includes(signal);
  }

  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(signal)}([^a-z0-9]|$)`).test(
    text
  );
}

export function classifyFoodCaption(caption) {
  const text = normalizedCaption(caption);

  if (!text) {
    return {
      isFood: false,
      confidence: "low",
      reason: "No caption was available to classify."
    };
  }

  const foodMatches = FOOD_SIGNALS.filter((signal) => hasSignal(text, signal));
  const nonFoodMatches = NON_FOOD_SIGNALS.filter((signal) =>
    hasSignal(text, signal)
  );

  if (nonFoodMatches.length > 0) {
    return {
      isFood: false,
      confidence: "high",
      reason: `Non-food signals: ${nonFoodMatches.slice(0, 5).join(", ")}.`
    };
  }

  if (foodMatches.length > 0) {
    return {
      isFood: true,
      confidence: foodMatches.length >= 2 ? "high" : "medium",
      reason: `Food signals: ${foodMatches.slice(0, 5).join(", ")}.`
    };
  }

  return {
    isFood: false,
    confidence: "medium",
    reason: "No food or restaurant signals found in caption."
  };
}

function classifyPlaylistTitles(titles = []) {
  const text = titles.map(normalizedCaption).filter(Boolean).join(" ");

  if (!text) {
    return null;
  }

  const foodMatches = FOOD_SIGNALS.filter((signal) => hasSignal(text, signal));
  const nonFoodMatches = NON_FOOD_SIGNALS.filter((signal) =>
    hasSignal(text, signal)
  );

  if (nonFoodMatches.length > 0) {
    return {
      isFood: false,
      confidence: "high",
      reason: `Non-food playlist signals: ${nonFoodMatches
        .slice(0, 5)
        .join(", ")}.`
    };
  }

  if (foodMatches.length > 0) {
    return {
      isFood: true,
      confidence: "high",
      reason: `Food playlist signals: ${foodMatches.slice(0, 5).join(", ")}.`
    };
  }

  return null;
}

export function classifyPost(post) {
  const captionClassification = classifyFoodCaption(post.caption);

  if (
    !captionClassification.isFood &&
    captionClassification.confidence === "high"
  ) {
    return captionClassification;
  }

  const playlistClassification = classifyPlaylistTitles(
    post.raw?.youtubePlaylists ?? []
  );

  if (playlistClassification) {
    return playlistClassification;
  }

  return captionClassification;
}

async function upsertTags(supabase, tagNames) {
  if (tagNames.length === 0) {
    return [];
  }

  const rows = tagNames.map((name) => ({
    name,
    slug: slugify(name),
    tag_type: "general"
  }));

  const { data, error } = await supabase
    .from("directory_tags")
    .upsert(rows, { onConflict: "slug" })
    .select("id, name, slug");

  if (error) {
    throw new Error(`Unable to upsert tags: ${error.message}`);
  }

  return data ?? [];
}

export async function processPendingPost(supabase, post) {
  const classification = classifyPost(post);

  if (!classification.isFood) {
    const { error: videoDeleteError } = await supabase
      .from("food_videos")
      .delete()
      .eq("instagram_media_id", post.media_id);

    if (videoDeleteError) {
      throw new Error(`Unable to remove ignored food video: ${videoDeleteError.message}`);
    }

    const { error: ignoredError } = await supabase
      .from("instagram_posts")
      .update({
        status: "Ignored",
        raw: {
          ...(post.raw ?? {}),
          classification
        }
      })
      .eq("id", post.id);

    if (ignoredError) {
      throw new Error(`Unable to ignore post: ${ignoredError.message}`);
    }

    return {
      instagramPostId: post.id,
      foodVideoId: null,
      status: "Ignored",
      reason: classification.reason
    };
  }

  const title = titleFromCaption(post.caption);
  const tagNames = tagsFromCaption(post.caption);

  const { data: video, error: videoError } = await supabase
    .from("food_videos")
    .upsert(
      {
        instagram_post_id: post.id,
        instagram_media_id: post.media_id,
        title,
        dish_name: title,
        caption: post.caption,
        permalink: post.permalink,
        thumbnail_url: post.thumbnail_url,
        media_url: post.media_url,
        media_type: post.media_type,
        published_at: post.timestamp,
        status: "review",
        raw: {
          source: "mock-processPendingPost",
          classification,
          parsedTags: tagNames
        }
      },
      { onConflict: "instagram_media_id" }
    )
    .select("id")
    .single();

  if (videoError) {
    throw new Error(`Unable to create food video: ${videoError.message}`);
  }

  const tags = await upsertTags(supabase, tagNames);

  if (tags.length > 0) {
    const joinRows = tags.map((tag) => ({
      food_video_id: video.id,
      tag_id: tag.id
    }));

    const { error: tagError } = await supabase
      .from("food_video_tags")
      .upsert(joinRows, { onConflict: "food_video_id,tag_id" });

    if (tagError) {
      throw new Error(`Unable to attach tags: ${tagError.message}`);
    }
  }

  const { error: statusError } = await supabase
    .from("instagram_posts")
    .update({ status: "Processed" })
    .eq("id", post.id);

  if (statusError) {
    throw new Error(`Unable to update post status: ${statusError.message}`);
  }

  return {
    instagramPostId: post.id,
    foodVideoId: video.id,
    status: "Processed",
    tags: tags.map((tag) => tag.slug)
  };
}
