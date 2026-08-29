import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiMovieFinder } from "@/components/AiMovieFinder";
import * as omdb from "@/lib/omdb";

vi.mock("@/lib/omdb", async () => {
  const actual = await vi.importActual<typeof import("@/lib/omdb")>("@/lib/omdb");
  return {
    ...actual,
    searchMovies: vi.fn(),
    getMovieDetails: vi.fn(),
  };
});

describe("AiMovieFinder", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.mocked(omdb.searchMovies).mockReset();
    vi.mocked(omdb.getMovieDetails).mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("lets the user describe what they want and shows matching OMDb results", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        searchTerm: "space adventure",
        genreHints: ["sci-fi", "comedy"],
        maxRuntimeMinutes: null,
        reasoning: "You asked for a funny sci-fi movie.",
      }),
    });

    vi.mocked(omdb.searchMovies).mockResolvedValueOnce({
      results: [
        { imdbID: "tt1", Title: "Galaxy Laughs", Year: "2020", Type: "movie", Poster: "N/A" },
      ],
      totalResults: 1,
    });

    const onResults = vi.fn();
    render(<AiMovieFinder onResults={onResults} />);

    await user.type(
      screen.getByLabelText(/describe what you want to watch/i),
      "a funny sci-fi movie"
    );
    await user.click(screen.getByRole("button", { name: /find movies for me/i }));

    await waitFor(() => {
      expect(onResults).toHaveBeenCalledWith([
        { imdbID: "tt1", Title: "Galaxy Laughs", Year: "2020", Type: "movie", Poster: "N/A" },
      ]);
    });

    expect(omdb.searchMovies).toHaveBeenCalledWith("space adventure");
    expect(screen.getByText(/you asked for a funny sci-fi movie/i)).toBeInTheDocument();
  });

  it("shows an error state instead of crashing when OMDb search fails", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        searchTerm: "horror",
        genreHints: ["horror"],
        maxRuntimeMinutes: null,
        reasoning: "You asked for a scary movie.",
      }),
    });

    vi.mocked(omdb.searchMovies).mockRejectedValueOnce(new Error("OMDb request failed (500)"));

    const onResults = vi.fn();
    render(<AiMovieFinder onResults={onResults} />);

    await user.type(
      screen.getByLabelText(/describe what you want to watch/i),
      "a scary movie"
    );
    await user.click(screen.getByRole("button", { name: /find movies for me/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/OMDb request failed/i);
    expect(onResults).not.toHaveBeenCalled();
  });

  it("does not submit an empty description", async () => {
    const onResults = vi.fn();
    render(<AiMovieFinder onResults={onResults} />);

    expect(screen.getByRole("button", { name: /find movies for me/i })).toBeDisabled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
