const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});

function formatCount(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return numberFormatter.format(number);
}

async function fetchYouTubeSubscribers() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const channelHandle = process.env.YOUTUBE_CHANNEL_HANDLE ?? "@nickrizzodaily";

  if (!apiKey || (!channelId && !channelHandle)) {
    return null;
  }

  const params = new URLSearchParams({
    part: "statistics",
    key: apiKey
  });

  if (channelId) {
    params.set("id", channelId);
  } else {
    params.set("forHandle", channelHandle);
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
    { next: { revalidate: 60 * 60 } }
  );

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const count = payload?.items?.[0]?.statistics?.subscriberCount;

  return formatCount(count);
}

async function fetchInstagramFollowers() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  const graphVersion = process.env.META_GRAPH_API_VERSION ?? "v21.0";

  if (!accessToken || !userId) {
    return formatCount(process.env.INSTAGRAM_FOLLOWER_COUNT);
  }

  const params = new URLSearchParams({
    fields: "followers_count",
    access_token: accessToken
  });

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${userId}?${params.toString()}`,
    { next: { revalidate: 60 * 60 } }
  );

  if (!response.ok) {
    return formatCount(process.env.INSTAGRAM_FOLLOWER_COUNT);
  }

  const payload = await response.json();

  return formatCount(payload?.followers_count);
}

export async function getSocialStats() {
  const [instagram, youtube] = await Promise.all([
    fetchInstagramFollowers(),
    fetchYouTubeSubscribers()
  ]);

  return {
    instagram,
    tiktok: formatCount(process.env.TIKTOK_FOLLOWER_COUNT),
    youtube
  };
}
