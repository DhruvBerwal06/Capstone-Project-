// Thin client for the OMDb API (https://www.omdbapi.com/).
//
// Security note: the OMDb key is read from VITE_OMDB_API_KEY at build time.
// There is intentionally no hardcoded fallback key here — OMDb keys are
// free but rate-limited per key, and baking one into the client bundle
// means anyone can read it out of the shipped JS and exhaust it.

export interface Movie {
  imdbID: string;
  Title: string;
  Year: string;
  Type: string;
  Poster: string;
}

export interface MovieDetails extends Movie {
  Plot: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Actors: string;
  imdbRating: string;
  Ratings: Array<{ Source: string; Value: string }>;
}

const OMDB_BASE_URL = "https://www.omdbapi.com/";

export class OmdbConfigError extends Error {
  constructor() {
    super(
      "Movie search isn't configured yet. Ask the site owner to set VITE_OMDB_API_KEY."
    );
    this.name = "OmdbConfigError";
  }
}

function getApiKey(): string {
  const key = import.meta.env.VITE_OMDB_API_KEY as string | undefined;
  if (!key) {
    throw new OmdbConfigError();
  }
  return key;
}

/** Search OMDb by free-text title. Returns an empty array if there are no matches. */
export async function searchMovies(
  query: string,
  signal?: AbortSignal
): Promise<{ results: Movie[]; totalResults: number }> {
  const apiKey = getApiKey();
  const url = `${OMDB_BASE_URL}?apikey=${apiKey}&s=${encodeURIComponent(query)}&type=movie`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`OMDb request failed (${response.status})`);
  }
  const data = await response.json();

  // OMDb quirk: it always returns HTTP 200, even for "no results" — the
  // real signal is the Response field, not the status code.
  if (data.Response === "True") {
    return {
      results: data.Search ?? [],
      totalResults: parseInt(data.totalResults, 10) || 0,
    };
  }

  if (data.Error && data.Error !== "Movie not found!") {
    throw new Error(data.Error);
  }
  return { results: [], totalResults: 0 };
}

/** Fetch full details for a single title by IMDb ID. */
export async function getMovieDetails(
  imdbID: string,
  signal?: AbortSignal
): Promise<MovieDetails> {
  const apiKey = getApiKey();
  const url = `${OMDB_BASE_URL}?apikey=${apiKey}&i=${encodeURIComponent(imdbID)}&plot=full`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`OMDb request failed (${response.status})`);
  }
  const data = await response.json();
  if (data.Response !== "True") {
    throw new Error(data.Error || "Movie details not found");
  }
  return data as MovieDetails;
}

/** Parses OMDb's "123 min" runtime string into a number of minutes, or null if unknown. */
export function parseRuntimeMinutes(runtime: string | undefined): number | null {
  if (!runtime) return null;
  const match = /(\d+)/.exec(runtime);
  return match ? parseInt(match[1], 10) : null;
}
