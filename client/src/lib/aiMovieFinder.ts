// Client-side helper for the "AI Movie Finder" feature.
//
// The natural-language description is sent to our own backend
// (POST /api/ai/movie-finder), which calls the Gemini API server-side
// so the API key never reaches the browser. The AI only ever returns
// *search criteria* (a search term, genre hints, an optional runtime cap) —
// it never invents movie titles, posters, or ratings. Those always come
// from OMDb, which remains the single source of truth for movie data.

export interface AiSuggestion {
  searchTerm: string;
  genreHints: string[];
  maxRuntimeMinutes: number | null;
  reasoning: string;
}

const GENRE_KEYWORDS: Record<string, string[]> = {
  comedy: ["funny", "comedy", "hilarious", "laugh", "joke", "satire"],
  "sci-fi": ["sci-fi", "scifi", "science fiction", "space", "alien", "futuristic"],
  horror: ["horror", "scary", "creepy", "terrifying", "spooky", "monster"],
  romance: ["romance", "romantic", "love story", "sweet", "heartwarming", "charming"],
  action: ["action", "explosive", "fight", "adventure", "thrilling"],
  drama: ["drama", "emotional", "moving", "serious", "family", "intense"],
  thriller: ["thriller", "suspense", "tense", "mystery", "crime", "twist"],
  animation: ["animated", "animation", "cartoon", "pixar", "family animation"],
  documentary: ["documentary", "true story", "real-life", "history", "biopic"],
};

const MOOD_KEYWORDS: Record<string, string[]> = {
  cozy: ["cozy", "comfort", "warm", "feel-good", "lighthearted"],
  dark: ["dark", "grim", "bleak", "moody", "gloomy"],
  mindbending: ["mind-bending", "thought-provoking", "smart", "clever", "brainy"],
  adventurous: ["adventurous", "epic", "quest", "escape", "journey"],
};

const CONCEPT_PRIORITY = [
  { name: "heist", keys: ["heist"] },
  { name: "sci-fi", keys: ["sci-fi", "scifi", "science fiction", "space", "alien"] },
  { name: "comedy", keys: ["funny", "comedy", "hilarious", "laugh", "joke", "satire"] },
  { name: "romance", keys: ["romance", "romantic", "love story", "heartwarming"] },
  { name: "horror", keys: ["horror", "scary", "creepy", "spooky", "monster"] },
  { name: "action", keys: ["action", "explosive", "fight", "adventure", "thrilling"] },
  { name: "thriller", keys: ["thriller", "suspense", "tense", "mystery", "crime", "twist"] },
  { name: "documentary", keys: ["documentary", "true story", "real-life", "history"] },
  { name: "animation", keys: ["animated", "animation", "cartoon", "pixar"] },
];

const STOP_WORDS = new Set([
  "a", "an", "and", "about", "for", "with", "the", "this", "that", "i", "want",
  "something", "sort", "kind", "of", "to", "like", "tonight", "movie", "movies",
  "film", "films", "feel", "good", "vibe", "but", "or", "really", "just",
  "into", "on", "in", "it", "is", "be", "my", "me", "we", "our", "under",
  "preferably", "maybe", "around", "at", "from", "by", "too", "not", "very",
  "more", "less"
]);

/**
 * Pure, dependency-free fallback used when the AI backend is unavailable
 * (no API key configured, network error, rate limit, etc). It can't
 * understand nuance the way a real model can, but it keeps the feature
 * usable end-to-end instead of failing outright.
 */
export function heuristicSuggestion(description: string): AiSuggestion {
  const lower = description.toLowerCase();

  const genreHints = Object.entries(GENRE_KEYWORDS)
    .filter(([, keywords]) => keywords.some(k => lower.includes(k)))
    .map(([genre]) => genre);

  const moodHints = Object.entries(MOOD_KEYWORDS)
    .filter(([, keywords]) => keywords.some(k => lower.includes(k)))
    .map(([mood]) => mood);

  const conceptHits = CONCEPT_PRIORITY.flatMap(({ name, keys }) =>
    keys.some(key => lower.includes(key)) ? [name] : []
  );

  const searchTokens = new Set<string>();
  for (const concept of conceptHits) {
    searchTokens.add(concept);
  }
  for (const hint of genreHints) {
    searchTokens.add(hint);
  }
  for (const mood of moodHints) {
    searchTokens.add(mood);
  }

  const searchTerm =
    Array.from(searchTokens).slice(0, 3).join(" ") ||
    description
      .trim()
      .split(/\s+/)
      .map(word => word.replace(/[.,!?]/g, ""))
      .filter(word => word && !STOP_WORDS.has(word.toLowerCase()))
      .slice(0, 3)
      .join(" ") ||
    "movie";

  let maxRuntimeMinutes: number | null = null;
  const hourMatch = /under\s+(\d+(?:\.\d+)?)\s*hours?/.exec(lower);
  const minuteMatch = /under\s+(\d+)\s*(?:min|minutes)/.exec(lower);
  if (hourMatch) {
    maxRuntimeMinutes = Math.round(parseFloat(hourMatch[1]) * 60);
  } else if (minuteMatch) {
    maxRuntimeMinutes = parseInt(minuteMatch[1], 10);
  }

  const hints = [...genreHints, ...moodHints].filter(
    (hint, index, items) => items.indexOf(hint) === index
  );

  return {
    searchTerm,
    genreHints: hints,
    maxRuntimeMinutes,
    reasoning: hints.length
      ? `I interpreted your description as ${hints.join(", ")} with a runtime cap of ${maxRuntimeMinutes ?? "no explicit limit"}.`
      : "I used the strongest mood and intent words from your description to narrow the search.",
  };
}

export interface AiMovieFinderResult {
  suggestion: AiSuggestion;
  usedFallback: boolean;
}

/**
 * Gets AI-interpreted search criteria for a natural-language movie request.
 * Never throws — on any failure it degrades to the local heuristic so the
 * feature stays usable.
 */
export async function getAiSuggestion(
  description: string,
  signal?: AbortSignal
): Promise<AiMovieFinderResult> {
  try {
    const response = await fetch("/api/ai/movie-finder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
      signal,
    });

    if (!response.ok) {
      return { suggestion: heuristicSuggestion(description), usedFallback: true };
    }

    const data = await response.json();
    if (
      typeof data.searchTerm !== "string" ||
      !Array.isArray(data.genreHints) ||
      typeof data.reasoning !== "string"
    ) {
      return { suggestion: heuristicSuggestion(description), usedFallback: true };
    }

    return {
      suggestion: {
        searchTerm: data.searchTerm,
        genreHints: data.genreHints,
        maxRuntimeMinutes:
          typeof data.maxRuntimeMinutes === "number" ? data.maxRuntimeMinutes : null,
        reasoning: data.reasoning,
      },
      usedFallback: false,
    };
  } catch {
    return { suggestion: heuristicSuggestion(description), usedFallback: true };
  }
}
