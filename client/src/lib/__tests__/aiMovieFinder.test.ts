import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { heuristicSuggestion, getAiSuggestion } from "@/lib/aiMovieFinder";

describe("heuristicSuggestion (fallback used when AI is unavailable)", () => {
  it("infers a higher-level concept instead of a raw keyword search", () => {
    const result = heuristicSuggestion("I want a funny sci-fi movie for tonight");
    expect(result.genreHints).toContain("comedy");
    expect(result.genreHints).toContain("sci-fi");
    expect(result.searchTerm).toMatch(/sci-fi|comedy/);
    expect(result.searchTerm).not.toBe("funny sci-fi movie");
  });

  it("turns a mood-heavy action description into a more useful intent search", () => {
    const result = heuristicSuggestion("a smart heist movie with a cozy feel-good vibe under 2 hours");
    expect(result.genreHints).toContain("cozy");
    expect(result.searchTerm).toMatch(/heist|cozy|mindbending/);
    expect(result.maxRuntimeMinutes).toBe(120);
  });

  it("parses an 'under N hours' runtime constraint into minutes", () => {
    const result = heuristicSuggestion("a horror movie under 2 hours");
    expect(result.maxRuntimeMinutes).toBe(120);
  });

  it("parses an 'under N minutes' runtime constraint", () => {
    const result = heuristicSuggestion("something under 90 minutes");
    expect(result.maxRuntimeMinutes).toBe(90);
  });

  it("uses mood-and-genre cues even when the request is vague", () => {
    const result = heuristicSuggestion("a heartwarming story about dogs");
    expect(result.genreHints.length).toBeGreaterThan(0);
    expect(result.searchTerm).toMatch(/heartwarming|story|dogs|romance|cozy/);
    expect(result.maxRuntimeMinutes).toBeNull();
  });
});

describe("getAiSuggestion (network wrapper)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns the AI's suggestion when the backend responds successfully", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        searchTerm: "space adventure",
        genreHints: ["sci-fi", "comedy"],
        maxRuntimeMinutes: 120,
        reasoning: "You asked for a funny, short sci-fi movie.",
      }),
    });

    const { suggestion, usedFallback } = await getAiSuggestion("funny sci-fi under 2 hours");
    expect(usedFallback).toBe(false);
    expect(suggestion.searchTerm).toBe("space adventure");
    expect(suggestion.genreHints).toEqual(["sci-fi", "comedy"]);
  });

  it("degrades to the heuristic fallback when the backend errors", async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 503 });

    const { suggestion, usedFallback } = await getAiSuggestion("a funny movie");
    expect(usedFallback).toBe(true);
    expect(suggestion.genreHints).toContain("comedy");
  });

  it("degrades to the heuristic fallback on a network failure", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("network down"));

    const { usedFallback } = await getAiSuggestion("a scary movie");
    expect(usedFallback).toBe(true);
  });

  it("degrades to the heuristic fallback when the backend response shape is invalid", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ unexpected: "shape" }),
    });

    const { usedFallback } = await getAiSuggestion("a scary movie");
    expect(usedFallback).toBe(true);
  });
});
