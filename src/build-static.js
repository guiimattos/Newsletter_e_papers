import fs from "node:fs/promises";
import path from "node:path";
import { build } from "vite";
import { generateNewsletter } from "./newsletter.js";

const root = process.cwd();
const dataDir = path.join(root, "data");
const distDir = path.join(root, "dist");
const editionsDir = path.join(distDir, "data", "editions");

// --skip-generate rebuilds the site from the editions already in ./data
const newsletter = process.argv.includes("--skip-generate") ? null : await generateNewsletter();

await build({ configFile: path.join(root, "vite.config.js"), logLevel: "warn" });

await fs.mkdir(editionsDir, { recursive: true });
await fs.copyFile(path.join(dataDir, "latest.json"), path.join(distDir, "data", "latest.json"));

// Archive: every dated edition plus an index the edition picker reads.
const files = (await fs.readdir(dataDir)).filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort().reverse();
const index = [];
for (const name of files) {
  await fs.copyFile(path.join(dataDir, name), path.join(editionsDir, name));
  index.push({ date: name.replace(".json", "") });
}
await fs.writeFile(path.join(editionsDir, "index.json"), JSON.stringify(index));

// GitHub Pages serves static files only.
await fs.writeFile(path.join(distDir, ".nojekyll"), "");

console.log(
  `Built site in dist/ with ${files.length} edition(s)${newsletter ? `; today's has ${newsletter.counts.total} items` : ""}`
);
process.exit(0);
