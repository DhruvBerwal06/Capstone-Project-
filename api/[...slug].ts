import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  // Vercel's static file serving handles SPA routing automatically
  // This file shouldn't be needed, but keeping it as a fallback
  res.status(404).json({ error: "Not found" });
};
