# CinePulse

A movie search app built on the OMDb API, with an AI-powered "describe what
you want to watch" finder layered on top. Originally a Week 8 internship
capstone project.

## Overview

CinePulse lets you search movies by title, view details (plot, cast,
ratings, runtime), save favorites, and — the newer part — describe what
you're in the mood for in plain language ("a funny sci-fi movie for
tonight, under 2 hours") and get back real OMDb search results filtered to
match.

## Features

- **Movie search** — debounced title search against OMDb, with a details
  modal (poster, plot, genre, director, cast, IMDb rating, other ratings).
- **AI Movie Finder** — natural-language input that Gemini turns into
  structured search criteria (a search term, genre hints, an optional
  runtime cap), which are then run through the same OMDb search everything
  else uses. The AI never invents movie titles or facts — it only proposes
  _criteria_; OMDb is always the source of truth for what's shown.
- **Favorites** — save/remove movies per signed-in user.
- **Accounts** — sign up / log in / log out. **Note:** auth is currently
  implemented with `localStorage`, not a real backend — see
  [Known limitations](#known-limitations).
- Loading, empty, and error states throughout; responsive layout;
  keyboard-navigable forms with associated labels.

## Tech stack

- **Client:** React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui
  (Radix primitives), wouter (routing), sonner (toasts)
- **Server:** Express (serves the built client in production; proxies the
  AI endpoint in development)
- **AI:** Gemini API, called server-side only
- **Movie data:** [OMDb API](https://www.omdbapi.com/)
- **Testing:** Vitest + React Testing Library

## Installation & setup

```bash
npm install
cp .env.example .env
# then edit .env — see Environment variables below
```

## Environment variables

| Variable            | Where it's used     | Required                                    | Notes                                                                                                                                                                                        |
| ------------------- | ------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_OMDB_API_KEY` | Client (build-time) | Yes                                         | Free key from https://www.omdbapi.com/apikey.aspx. Baked into the client bundle at build time — this is normal for OMDb's free-tier keys, which are rate-limited per key rather than secret. |
| `GEMINI_API_KEY`    | Server only         | No (feature degrades gracefully without it) | From https://aistudio.google.com/app/apikey. **Never** prefix this with `VITE_` — that would expose it to the browser.                                                                       |
| `PORT`              | Server only         | No, defaults to `5000`                      | Also used by the Vite dev proxy to find the API server.                                                                                                                                      |

`.env` is git-ignored. `.env.example` documents the shape without real
values.

## How to run locally

You need two processes running: the Vite dev server (client) and the
Express server (API, currently just the AI endpoint).

```bash
# terminal 1
npm run dev          # client on http://localhost:3000

# terminal 2
npm run dev:server   # API on http://localhost:5000
```

Vite proxies `/api/*` requests to the Express server (see
`vite.config.ts`), so open **http://localhost:3000** and everything works
To run locally during development:

```bash
npm run dev       # Vite dev server on port 3000
npm run dev:all   # Vite + Express server (requires .env with GEMINI_API_KEY)
```

For production (Vercel):

```bash
npm run build     # Build client only (outputs to dist/public)
```

The Express server in `server/index.ts` is for local development only. On Vercel, APIs use serverless functions in `api/`.

## Basic architecture

```
client/src/
  pages/Home.tsx           – single main page: auth, search, favorites, details modal
  components/AiMovieFinder.tsx – the AI feature's UI panel
  lib/omdb.ts               – all OMDb API calls (search, details) + the OMDb key check
  lib/aiMovieFinder.ts       – calls the AI backend, includes a pure heuristic fallback
  components/ui/            – shadcn/ui primitives (buttons, dialogs, inputs, etc.)
server/index.ts             – Express app: serves built client in prod,
                               exposes POST /api/ai/movie-finder
```

Data flow for the AI feature:

1. User types a description in `AiMovieFinder`.
2. Client calls `POST /api/ai/movie-finder` with the description.
3. Server calls the Gemini API with a system prompt asking for JSON
   search criteria only (never movie names).
4. Client takes the returned `searchTerm` and runs it through
   `lib/omdb.ts`'s `searchMovies`, then (if a runtime cap was given) looks
   up details for a handful of candidates to filter by runtime.
5. Real OMDb movies are shown — the AI never appears in the actual movie
   data, only in choosing what to search for.

## Why AI is useful here

Movie search by title only works if you already know what you want.
Most people describe a _mood_ ("something funny," "not too long," "kind of
like a heist movie") rather than a title. The AI Movie Finder translates
that fuzzy description into concrete search parameters OMDb can actually
use, without hallucinating movies that don't exist — it's a translation
layer, not a chatbot.

## Testing

```bash
npm test          # run once
npm run test:watch
```

Current coverage focuses on the AI feature, since it's the new/riskiest
part of the app:

- `client/src/lib/__tests__/aiMovieFinder.test.ts` — the heuristic fallback
  parser (genre detection, runtime parsing) and the network wrapper's
  graceful degradation on backend errors, network failures, and malformed
  responses.
- `client/src/components/__tests__/AiMovieFinder.test.tsx` — the finder
  panel end-to-end: submitting a description, showing AI-derived results,
  and showing an error state (not a crash) when OMDb search fails.

## Accessibility

- All form inputs have programmatically associated `<label>`s (via
  matching `id`/`htmlFor`, generated with React's `useId`).
- Icon-only buttons (favorite toggle, logout) have `aria-label`s;
  decorative icons are `aria-hidden`.
- Loading and error regions use `role="status"` / `aria-live="polite"` so
  screen readers announce state changes.
- The movie details modal always renders a `DialogTitle` (visually hidden
  while loading) to satisfy Radix's dialog accessibility requirement.
- Not yet run: a full Lighthouse/axe/WAVE audit — see
  `docs/DEPLOYMENT_CHECKLIST.md`.

## Known limitations

- **Auth is `localStorage`-based, not a real backend.** There's no
  password hashing, no server-side session, and favorites/accounts are
  per-browser, not per-person across devices. This was an existing
  decision in the project, not something introduced by this pass — it's
  flagged here so it's not mistaken for a production-ready auth system.
- The `VITE_OMDB_API_KEY` is visible in the built client bundle. This is
  inherent to OMDb's free-tier client-side usage model, not a leak
  introduced here — but it does mean the key should be treated as
  rate-limited-but-public, never a secret credential.
- The AI runtime filter only checks the first 8 search results (to limit
  OMDb detail lookups), so a long tail of matching-but-unchecked results
  may be missed.
- No automated accessibility or performance audit has been run (see
  `docs/DEPLOYMENT_CHECKLIST.md` for what to check manually).

## Future improvements

- Replace `localStorage` auth with a real backend (sessions or JWT +
  password hashing) if this app needs to be genuinely multi-device/secure.
- Cache OMDb responses to reduce redundant requests and API usage.
- Let the AI finder ask a clarifying follow-up when a description is too
  vague to produce a useful search term.
- Add pagination for search results (OMDb returns up to 10 per page).

## Deployment and rollback

See `docs/DEPLOYMENT_CHECKLIST.md` for the full checklist. Summary:

- **Deploy:** `npm run build` produces `dist/public` (static client) and
  `dist/index.js` (server bundle). Any Node host that can run
  `node dist/index.js` with `VITE_OMDB_API_KEY` set at build time and
  `GEMINI_API_KEY`/`PORT` set at runtime will work.
- **Rollback:** keep the previous build artifact (`dist/`) or previous
  git commit/tag around; redeploying it is the rollback — there's no
  database migration to reverse since there's no database.
