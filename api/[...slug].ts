import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (req: any, res: any) => {
  // For any request that isn't caught by the specific routes,
  // serve the index.html for client-side routing
  const indexPath = path.join(__dirname, "../dist/public/index.html");

  if (fs.existsSync(indexPath)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const html = fs.readFileSync(indexPath, "utf-8");
    res.status(200).send(html);
  } else {
    res.status(404).json({ error: "Not found" });
  }
};
