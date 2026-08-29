import { useId, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { getAiSuggestion, type AiSuggestion } from "@/lib/aiMovieFinder";
import { searchMovies, parseRuntimeMinutes, getMovieDetails, type Movie } from "@/lib/omdb";

interface AiMovieFinderProps {
  onResults: (movies: Movie[]) => void;
}

type Status = "idle" | "thinking" | "error";

/**
 * A genuine feature of the movie app, not a chatbot: the person describes
 * what they're in the mood for, the AI turns that into search criteria
 * (genre, runtime cap, a search term), and we run that through the same
 * OMDb search the rest of the app uses. All movie facts shown afterwards
 * come from OMDb, never from the AI.
 */
export function AiMovieFinder({ onResults }: AiMovieFinderProps) {
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const textareaId = useId();
  const statusId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed) return;

    setStatus("thinking");
    setErrorMessage("");
    setSuggestion(null);

    try {
      const { suggestion: result, usedFallback: fellBack } = await getAiSuggestion(trimmed);
      setSuggestion(result);
      setUsedFallback(fellBack);

      const { results } = await searchMovies(result.searchTerm);

      let filtered = results;
      if (result.maxRuntimeMinutes) {
        // OMDb search results don't include runtime, so we look up details
        // for a small candidate set to apply the time filter. Capped at 8
        // lookups to keep this fast and light on the API.
        const withDetails = await Promise.all(
          results.slice(0, 8).map(async movie => {
            try {
              const details = await getMovieDetails(movie.imdbID);
              return { movie, minutes: parseRuntimeMinutes(details.Runtime) };
            } catch {
              return { movie, minutes: null };
            }
          })
        );
        filtered = withDetails
          .filter(({ minutes }) => minutes === null || minutes <= result.maxRuntimeMinutes!)
          .map(({ movie }) => movie);
      }

      onResults(filtered);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong finding movies for you."
      );
    }
  };

  return (
    <Card className="glass-card p-6 border-white/10 mb-8 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor={textareaId} className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
          Describe what you want to watch
        </label>
        <Textarea
          id={textareaId}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. a funny sci-fi movie for tonight, preferably under 2 hours"
          className="bg-white/5 border-white/10 text-foreground placeholder:text-foreground/40"
          rows={2}
          maxLength={500}
          aria-describedby={statusId}
        />
        <Button
          type="submit"
          disabled={status === "thinking" || !description.trim()}
          className="gap-2"
        >
          {status === "thinking" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Finding movies...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Find movies for me
            </>
          )}
        </Button>
      </form>

      <div id={statusId} role="status" aria-live="polite" className="mt-3">
        {status === "error" && (
          <p className="text-destructive text-sm">{errorMessage}</p>
        )}
        {suggestion && status !== "error" && (
          <p className="text-foreground/60 text-sm">
            {suggestion.reasoning}
            {usedFallback && " (AI suggestions are temporarily unavailable, so this used a simpler keyword match.)"}
          </p>
        )}
      </div>
    </Card>
  );
}
