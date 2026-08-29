const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-3.6-flash",
] as const;

interface AiSuggestion {
  searchTerm: string;
  genreHints: string[];
  maxRuntimeMinutes: number | null;
  reasoning: string;
}

function extractGeminiText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];

  for (const candidate of candidates) {
    const candidateObj = candidate as Record<string, unknown> | null;
    if (!candidateObj) continue;

    const directText =
      typeof candidateObj.text === "string" ? candidateObj.text : "";
    if (directText.trim()) return directText;

    const content = candidateObj.content as Record<string, unknown> | undefined;
    if (content && typeof content === "object") {
      const contentText =
        typeof content.text === "string"
          ? content.text
          : Array.isArray(content.parts)
            ? content.parts
                .map(part => (typeof part?.text === "string" ? part.text : ""))
                .join("")
            : "";

      if (contentText.trim()) return contentText;
    }
  }

  return null;
}

async function interpretMovieRequest(
  description: string
): Promise<AiSuggestion> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const systemPrompt = `You turn a short, casual description of what someone wants to watch into movie SEARCH CRITERIA for the OMDb API. You do not know about specific movies and must not name any -- only return search terms and filters. Respond with ONLY a JSON object (no prose, no markdown fences) matching this shape: { "searchTerm": string, "genreHints": string[], "maxRuntimeMinutes": number | null, "reasoning": string } Rules: - searchTerm should be 1-3 words and suitable for an OMDb title search. - genreHints should contain 0-4 short genre words. - maxRuntimeMinutes should be a number only when the user gives a time limit; otherwise null. - reasoning should be one short sentence explaining your interpretation.`;

  let lastError: unknown = null;

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: description }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 512,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        const text2 = await response.text().catch(() => "");
        lastError = new Error(
          `Gemini API error for ${model}: ${response.status}: ${text2}`
        );
        continue;
      }

      const data = await response.json();
      const text = extractGeminiText(data);

      if (!text) {
        lastError = new Error(
          `Gemini API returned no text content for ${model}`
        );
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        lastError = new Error(
          `Gemini API returned non-JSON content for ${model}`
        );
        continue;
      }

      const candidate = parsed as Partial<AiSuggestion>;

      if (
        typeof candidate.searchTerm !== "string" ||
        !Array.isArray(candidate.genreHints)
      ) {
        lastError = new Error(
          `Gemini API returned an unexpected shape for ${model}`
        );
        continue;
      }

      return {
        searchTerm: candidate.searchTerm,
        genreHints: candidate.genreHints.filter(
          (g): g is string => typeof g === "string"
        ),
        maxRuntimeMinutes:
          typeof candidate.maxRuntimeMinutes === "number"
            ? candidate.maxRuntimeMinutes
            : null,
        reasoning:
          typeof candidate.reasoning === "string" ? candidate.reasoning : "",
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini API failed for all configured models");
}

export default async (req: any, res: any) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const description =
    typeof req.body?.description === "string"
      ? (req.body.description as string).trim()
      : "";

  if (!description) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "description is required" }));
    return;
  }

  if (description.length > 500) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({ error: "description is too long (max 500 characters)" })
    );
    return;
  }

  try {
    const suggestion = await interpretMovieRequest(description);
    res.statusCode = 200;
    res.end(JSON.stringify(suggestion));
  } catch (error) {
    console.error("AI movie-finder error:", error);
    res.statusCode = 503;
    res.end(
      JSON.stringify({
        error: "AI suggestion is temporarily unavailable",
      })
    );
  }
};
