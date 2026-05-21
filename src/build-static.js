import fs from "node:fs/promises";
import path from "node:path";
import { generateNewsletter } from "./newsletter.js";

const root = process.cwd();
const distDir = path.join(root, "dist");

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(path.join(distDir, "data"), { recursive: true });

const newsletter = await generateNewsletter();

await fs.cp(path.join(root, "public"), distDir, { recursive: true });
await fs.writeFile(path.join(distDir, "data", "latest.json"), JSON.stringify(newsletter, null, 2));

// GitHub Pages serves static files only; this keeps SPA-style refreshes harmless.
await fs.writeFile(path.join(distDir, ".nojekyll"), "");

console.log(`Built static GitHub Pages site with ${newsletter.items.length} items in dist/`);
process.exit(0);
