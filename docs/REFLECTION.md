# Reflection

**What was hardest, and why?**

The hardest part wasn't the AI feature — it was realizing the codebase I
started from wasn't what it looked like on the surface. The auth flow had
comments like `// Simulate auth - in real app, use Firebase`, and there
was a real-looking OMDb key hardcoded directly in the client source as a
fallback. It would have been easy to just build the AI feature on top and
call it done, but that would have meant shipping "production-ready"
polish over an exposed key and auth that only pretends to be real. Sorting
out what was actually true about the app before adding anything new took
longer than writing the feature itself.

**What would I do differently next time?**

I'd audit a starter project for hardcoded secrets and "simulated"
functionality *before* accepting its scope, not after. I'd also have set
up environment variables and a `.env.example` on day one instead of
letting a fallback key creep into the source — it's a much easier problem
to prevent than to clean up later, especially once other code starts
depending on the fallback existing.

**What's one thing I learned that surprised me?**

That Node (20.6+) has a built-in `--env-file` flag, so I didn't need to
add `dotenv` as a dependency just to load `.env` values for the Express
server — one less package for something the runtime already does. It's a
small thing, but it's a good reminder to check what the platform already
supports before reaching for a library, especially on a project that's
explicitly supposed to stay small.
