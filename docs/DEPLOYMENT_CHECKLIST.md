# Deployment Checklist

## Build

- [ ] `npm install` completes with no errors
- [ ] `npm run check` (TypeScript) passes with no errors
- [ ] `npm run build` completes and produces `dist/public/` and `dist/index.js`
- [ ] Built app loads locally via `npm start` with production env vars set

## Environment variables / security

- [ ] `.env` is **not** committed (confirm it's in `.gitignore` — it is)
- [ ] `VITE_OMDB_API_KEY` set before running `npm run build` (it's baked in
      at build time, not read at runtime)
- [ ] `Gemini_API_KEY` set on the server host as a runtime secret (never
      prefixed with `VITE_`)
- [ ] No API keys appear hardcoded anywhere in `client/src` or `server/`
      (grep for `sk-`, `apikey`, quoted key-shaped strings before shipping)
- [ ] Gemini API key has no more privilege than it needs (a plain
      Messages API key; no need for admin/org-level keys)

## Testing

- [ ] `npm test` passes locally
- [ ] Manually test: search happy path, no-results state, network-failure
      state (e.g. throttle/offline in devtools)
- [ ] Manually test: AI Movie Finder happy path
- [ ] Manually test: AI Movie Finder with `Gemini_API_KEY` unset/invalid
      — should fall back gracefully, not crash or hang
- [ ] Manually test: sign up, log in, log out, add/remove favorite

## Accessibility

- [ ] Run Lighthouse (Chrome DevTools → Lighthouse → Accessibility) —
      **not yet done, do this before submission**
- [ ] Run axe or WAVE browser extension on the search page, the AI finder,
      and the details modal — **not yet done, do this before submission**
- [ ] Tab through the entire app with keyboard only (no mouse): can you
      reach and operate every control, including the modal's close and
      the favorite/logout icon buttons?
- [ ] Test with a screen reader (VoiceOver/NVDA) on at least the search
      flow and one error state

## Deployment

- [ ] Choose a Node-capable host (Render, Railway, Fly.io, a VPS, etc. —
      any host that runs `node dist/index.js`)
- [ ] Set `VITE_OMDB_API_KEY` in the **build** environment
- [ ] Set `Gemini_API_KEY` and `PORT` in the **runtime** environment
- [ ] Confirm the deployed URL loads and search works
- [ ] Confirm the deployed AI finder works (or degrades gracefully if the
      key isn't set yet)
- [ ] Take screenshots of: search results, AI finder in use, details
      modal, favorites tab, an error state — **for your own submission
      evidence, not something this pass can generate for you**

## Rollback

There's no database, so rollback is just "serve the previous build":

- [ ] Keep the previous `dist/` artifact or previous deployed git
      commit/tag available
- [ ] If a deploy breaks something, redeploy the last known-good
      commit/artifact rather than trying to hotfix forward under pressure
- [ ] Confirm rollback target still has the env vars it needs (hosts that
      wipe env vars on redeploy are a common rollback surprise)
