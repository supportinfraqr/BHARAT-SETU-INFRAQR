// YouTube URL helpers. Admins often paste a normal "watch" URL
// (https://www.youtube.com/watch?v=ID), but that cannot be embedded in an
// <iframe> (YouTube refuses to connect). These normalise any YouTube URL form
// into the /embed/ form and expose the video's thumbnail.

export function youTubeId(url?: string): string | null {
  const value = String(url ?? '').trim();
  if (!value) return null;
  const patterns = [
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
    /[?&]v=([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/live\/([A-Za-z0-9_-]{6,})/i,
  ];
  for (const re of patterns) {
    const m = value.match(re);
    if (m) return m[1];
  }
  // A bare 11-char video id.
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  return null;
}

/** An embeddable iframe URL for a YouTube link, or null when it is not YouTube. */
export function youTubeEmbed(url?: string): string | null {
  const id = youTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/** The video's thumbnail image URL, or null when it is not YouTube. */
export function youTubeThumb(url?: string): string | null {
  const id = youTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
