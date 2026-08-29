import { useEffect, useId, useMemo, useState } from "react";
import { Heart, Search, LogOut, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AiMovieFinder } from "@/components/AiMovieFinder";
import {
  searchMovies,
  getMovieDetails,
  OmdbConfigError,
  type Movie,
  type MovieDetails,
} from "@/lib/omdb";

export default function Home() {
  const emailInputId = useId();
  const passwordInputId = useId();
  const confirmPasswordInputId = useId();
  const displayNameInputId = useId();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    email: string;
    displayName?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  // Movie search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [totalResults, setTotalResults] = useState(0);

  // Favorites state
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Modal state
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  // View state
  const [view, setView] = useState<"search" | "favorites">("search");
  const [visibleResultsCount, setVisibleResultsCount] = useState(8);

  const visibleResults = useMemo(
    () => results.slice(0, visibleResultsCount),
    [results, visibleResultsCount]
  );

  const hasMoreResults = results.length > visibleResultsCount;

  useEffect(() => {
    setVisibleResultsCount(8);
  }, [query, view]);

  // Initialize auth state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Simulate auth check - in real app, check Firebase
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
          // Load favorites
          const storedFavorites = localStorage.getItem(
            `favorites_${userData.email}`
          );
          if (storedFavorites) {
            const favs = JSON.parse(storedFavorites);
            setFavorites(favs);
            setFavoriteIds(new Set(favs.map((f: Movie) => f.imdbID)));
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Search movies
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setTotalResults(0);
      setSearchError("");
      return;
    }

    const controller = new AbortController();

    const runSearch = async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const { results: found, totalResults: total } = await searchMovies(
          query,
          controller.signal
        );
        setResults(found);
        setTotalResults(total);
        if (found.length === 0) {
          setSearchError("No results found");
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResults([]);
        setTotalResults(0);
        setSearchError(
          error instanceof OmdbConfigError
            ? error.message
            : "Failed to search movies. Please try again."
        );
        console.error("Search error:", error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimer = setTimeout(runSearch, 300);
    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [query]);

  // Fetch movie details
  useEffect(() => {
    if (!selectedMovieId) {
      setMovieDetails(null);
      setDetailsError("");
      return;
    }

    const controller = new AbortController();

    const fetchDetails = async () => {
      setDetailsLoading(true);
      setDetailsError("");
      try {
        const details = await getMovieDetails(selectedMovieId, controller.signal);
        setMovieDetails(details);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDetailsError(
          error instanceof Error ? error.message : "Couldn't load movie details."
        );
        console.error("Details fetch error:", error);
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchDetails();
    return () => controller.abort();
  }, [selectedMovieId]);

  // Handle login/register
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsSubmitting(true);

    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      if (!isLoginMode) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (!displayName) {
          throw new Error("Display name is required");
        }
      }

      // Simulate auth - in real app, use Firebase
      const userData = {
        email,
        displayName: isLoginMode ? email.split("@")[0] : displayName,
      };

      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setDisplayName("");
      toast.success(
        isLoginMode
          ? "Logged in successfully!"
          : "Account created successfully!"
      );
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Authentication failed"
      );
      toast.error(
        error instanceof Error ? error.message : "Authentication failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
    setFavorites([]);
    setFavoriteIds(new Set());
    setQuery("");
    setResults([]);
    setView("search");
    toast.success("Logged out successfully");
  };

  // Toggle favorite
  const toggleFavorite = (movie: Movie) => {
    if (!user) return;

    const isFavorite = favoriteIds.has(movie.imdbID);
    let newFavorites = [...favorites];
    let newFavoriteIds = new Set(favoriteIds);

    if (isFavorite) {
      newFavorites = newFavorites.filter(f => f.imdbID !== movie.imdbID);
      newFavoriteIds.delete(movie.imdbID);
      toast.success("Removed from favorites");
    } else {
      newFavorites.push(movie);
      newFavoriteIds.add(movie.imdbID);
      toast.success("Added to favorites");
    }

    setFavorites(newFavorites);
    setFavoriteIds(newFavoriteIds);
    localStorage.setItem(
      `favorites_${user.email}`,
      JSON.stringify(newFavorites)
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground/60">Loading CinePulse...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/10"
          aria-hidden="true"
        />

        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Film className="w-8 h-8 text-primary" />
              <h1 className="headline-lg text-primary">CinePulse</h1>
            </div>
            <p className="text-foreground/70">Discover your next obsession</p>
          </div>

          <Card className="glass-card p-8 border-white/10">
            <h2 className="headline-sm mb-6 text-center">
              {isLoginMode ? "Welcome Back" : "Create Account"}
            </h2>

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLoginMode && (
                <div>
                  <label
                    htmlFor={displayNameInputId}
                    className="block text-sm font-medium text-foreground/80 mb-2"
                  >
                    Display Name
                  </label>
                  <Input
                    id={displayNameInputId}
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className="bg-white/5 border-white/10 text-foreground placeholder:text-foreground/40"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor={emailInputId}
                  className="block text-sm font-medium text-foreground/80 mb-2"
                >
                  Email
                </label>
                <Input
                  id={emailInputId}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-foreground/40"
                />
              </div>

              <div>
                <label
                  htmlFor={passwordInputId}
                  className="block text-sm font-medium text-foreground/80 mb-2"
                >
                  Password
                </label>
                <Input
                  id={passwordInputId}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isLoginMode ? "current-password" : "new-password"}
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-foreground/40"
                />
              </div>

              {!isLoginMode && (
                <div>
                  <label
                    htmlFor={confirmPasswordInputId}
                    className="block text-sm font-medium text-foreground/80 mb-2"
                  >
                    Confirm Password
                  </label>
                  <Input
                    id={confirmPasswordInputId}
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="bg-white/5 border-white/10 text-foreground placeholder:text-foreground/40"
                  />
                </div>
              )}

              {authError && (
                <p role="alert" className="text-destructive text-sm">
                  {authError}
                </p>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground btn-smooth"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isLoginMode ? "Signing in..." : "Creating account..."}
                  </>
                ) : isLoginMode ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-foreground/60 text-sm">
                {isLoginMode
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setAuthError("");
                }}
                className="text-primary hover:text-primary/80 text-sm font-medium mt-2"
              >
                {isLoginMode ? "Create one" : "Sign in"}
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-white/10 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-6 h-6 text-primary" />
            <h1 className="headline-sm text-primary">CinePulse</h1>
          </div>

          <div className="flex items-center gap-4">
            <Tabs
              value={view}
              onValueChange={v => setView(v as "search" | "favorites")}
            >
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger
                  value="search"
                  className="data-[state=active]:bg-primary"
                >
                  Search
                </TabsTrigger>
                <TabsTrigger
                  value="favorites"
                  className="data-[state=active]:bg-primary"
                >
                  Favorites
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground/70">
                {user?.displayName || user?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                aria-label="Log out"
                className="border-white/10 hover:bg-white/5"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {view === "search" ? (
          <div>
            <AiMovieFinder onResults={setResults} />

            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative max-w-2xl mx-auto">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40"
                  aria-hidden="true"
                />
                <label htmlFor="movie-search-input" className="sr-only">
                  Search for a movie or show
                </label>
                <Input
                  id="movie-search-input"
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search for a movie or show..."
                  className="pl-12 h-12 bg-white/5 border-white/10 text-foreground placeholder:text-foreground/40 btn-smooth"
                />
              </div>
            </div>

            {/* Results count */}
            {!searchLoading && !searchError && query.trim() && (
              <p className="text-center text-foreground/60 mb-6" role="status">
                {totalResults} result{totalResults === 1 ? "" : "s"} found
              </p>
            )}

            {/* Loading state */}
            {searchLoading && (
              <div className="flex items-center justify-center py-12" role="status">
                <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
                <span className="sr-only">Searching movies…</span>
              </div>
            )}

            {/* Error / no-results state */}
            {searchError && !searchLoading && (
              <div className="text-center py-12" role="alert">
                <p className="text-destructive mb-2">{searchError}</p>
                <p className="text-foreground/60 text-sm">
                  Try searching for another movie, or describe what you're in the mood for above
                </p>
              </div>
            )}

            {/* Empty state (no query yet) */}
            {!query.trim() && !searchLoading && results.length === 0 && (
              <div className="text-center py-16">
                <div className="mb-4 flex justify-center">
                  <Film className="w-16 h-16 text-foreground/20" aria-hidden="true" />
                </div>
                <p className="text-foreground/60">
                  Start searching for movies, or tell the AI finder above what you're in the mood for
                </p>
              </div>
            )}

            {/* Results grid */}
            {visibleResults.length > 0 && !searchLoading && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {visibleResults.map((movie, index) => (
                    <Card
                      key={movie.imdbID}
                      className="glass-card group cursor-pointer overflow-hidden hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 fade-in-up"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <div className="relative aspect-[2/3] bg-white/5 overflow-hidden">
                        {movie.Poster && movie.Poster !== "N/A" ? (
                          <img
                            src={movie.Poster}
                            alt={movie.Title}
                            loading="lazy"
                            decoding="async"
                            width={300}
                            height={450}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-12 h-12 text-foreground/20" />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleFavorite(movie)}
                          aria-label={
                            favoriteIds.has(movie.imdbID)
                              ? `Remove ${movie.Title} from favorites`
                              : `Add ${movie.Title} to favorites`
                          }
                          aria-pressed={favoriteIds.has(movie.imdbID)}
                          className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                        >
                          <Heart
                            className={`w-5 h-5 ${
                              favoriteIds.has(movie.imdbID)
                                ? "fill-secondary text-secondary"
                                : "text-white"
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>

                      <div className="p-4">
                        <button
                          type="button"
                          onClick={() => setSelectedMovieId(movie.imdbID)}
                          className="text-left w-full hover:text-primary transition-colors"
                        >
                          <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                            {movie.Title}
                          </h3>
                          <p className="text-xs text-foreground/60">
                            {movie.Year}
                          </p>
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>

                {hasMoreResults && (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setVisibleResultsCount(c => c + 8)}
                      className="border-white/10 hover:bg-white/5"
                    >
                      Show more results
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Favorites view */}
            {favorites.length === 0 ? (
              <div className="text-center py-16">
                <div className="mb-4 flex justify-center">
                  <Heart className="w-16 h-16 text-foreground/20" />
                </div>
                <p className="text-foreground/60">
                  No favorites yet. Add some movies!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {favorites.map((movie, index) => (
                  <Card
                    key={movie.imdbID}
                    className="glass-card group cursor-pointer overflow-hidden hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 fade-in-up"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="relative aspect-[2/3] bg-white/5 overflow-hidden">
                      {movie.Poster && movie.Poster !== "N/A" ? (
                        <img
                          src={movie.Poster}
                          alt={movie.Title}
                          loading="lazy"
                          decoding="async"
                          width={300}
                          height={450}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-12 h-12 text-foreground/20" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleFavorite(movie)}
                        aria-label={`Remove ${movie.Title} from favorites`}
                        aria-pressed="true"
                        className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                      >
                        <Heart className="w-5 h-5 fill-secondary text-secondary" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="p-4">
                      <button
                        onClick={() => setSelectedMovieId(movie.imdbID)}
                        className="text-left w-full hover:text-primary transition-colors"
                      >
                        <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                          {movie.Title}
                        </h3>
                        <p className="text-xs text-foreground/60">
                          {movie.Year}
                        </p>
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Movie Details Modal */}
      <Dialog
        open={!!selectedMovieId}
        onOpenChange={open => !open && setSelectedMovieId(null)}
      >
        <DialogContent className="max-w-2xl glass-card border-white/10">
          {/* Radix requires a DialogTitle for accessibility even while loading/erroring */}
          {!movieDetails && (
            <DialogTitle className="sr-only">Movie details</DialogTitle>
          )}
          {detailsLoading ? (
            <div className="flex items-center justify-center py-12" role="status">
              <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
              <span className="sr-only">Loading movie details…</span>
            </div>
          ) : detailsError ? (
            <p role="alert" className="text-destructive text-center py-12">
              {detailsError}
            </p>
          ) : movieDetails ? (
            <>
              <DialogHeader>
                <DialogTitle className="headline-md">
                  {movieDetails.Title}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Poster */}
                <div className="md:col-span-1">
                  {movieDetails.Poster && movieDetails.Poster !== "N/A" ? (
                    <img
                      src={movieDetails.Poster}
                      alt={movieDetails.Title}
                      loading="lazy"
                      decoding="async"
                      width={300}
                      height={450}
                      sizes="(max-width: 768px) 100vw, 300px"
                      className="w-full rounded-lg"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-white/5 rounded-lg flex items-center justify-center">
                      <Film className="w-12 h-12 text-foreground/20" />
                    </div>
                  )}

                  <Button
                    onClick={() => toggleFavorite(movieDetails)}
                    className="w-full mt-4 gap-2"
                    variant={
                      favoriteIds.has(movieDetails.imdbID)
                        ? "default"
                        : "outline"
                    }
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        favoriteIds.has(movieDetails.imdbID)
                          ? "fill-current"
                          : ""
                      }`}
                    />
                    {favoriteIds.has(movieDetails.imdbID)
                      ? "In Favorites"
                      : "Add to Favorites"}
                  </Button>
                </div>

                {/* Details */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <p className="text-foreground/60 text-sm mb-1">Year</p>
                    <p className="text-foreground">{movieDetails.Year}</p>
                  </div>

                  <div>
                    <p className="text-foreground/60 text-sm mb-1">Genre</p>
                    <p className="text-foreground">{movieDetails.Genre}</p>
                  </div>

                  <div>
                    <p className="text-foreground/60 text-sm mb-1">Runtime</p>
                    <p className="text-foreground">{movieDetails.Runtime}</p>
                  </div>

                  <div>
                    <p className="text-foreground/60 text-sm mb-1">Director</p>
                    <p className="text-foreground">{movieDetails.Director}</p>
                  </div>

                  <div>
                    <p className="text-foreground/60 text-sm mb-1">Cast</p>
                    <p className="text-foreground text-sm">
                      {movieDetails.Actors}
                    </p>
                  </div>

                  {movieDetails.imdbRating &&
                    movieDetails.imdbRating !== "N/A" && (
                      <div>
                        <p className="text-foreground/60 text-sm mb-1">
                          IMDB Rating
                        </p>
                        <p className="text-lg font-semibold text-secondary">
                          {movieDetails.imdbRating}/10
                        </p>
                      </div>
                    )}

                  <div>
                    <p className="text-foreground/60 text-sm mb-2">Plot</p>
                    <p className="text-foreground text-sm leading-relaxed">
                      {movieDetails.Plot}
                    </p>
                  </div>

                  {movieDetails.Ratings && movieDetails.Ratings.length > 0 && (
                    <div>
                      <p className="text-foreground/60 text-sm mb-2">Ratings</p>
                      <div className="space-y-2">
                        {movieDetails.Ratings.map((rating, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-2 bg-white/5 rounded border border-white/10"
                          >
                            <span className="text-sm text-foreground/80">
                              {rating.Source}
                            </span>
                            <span className="text-sm font-semibold text-primary">
                              {rating.Value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
