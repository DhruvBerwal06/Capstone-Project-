// API routes are handled by nested files in api/ folder
// Example: /api/ai/movie-finder.ts handles POST /api/ai/movie-finder

export default async (req: any, res: any) => {
  res.setHeader("Content-Type", "application/json");
  res.statusCode = 404;
  res.end(JSON.stringify({ error: "Not found" }));
};
