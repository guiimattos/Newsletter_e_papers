import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const dataDir = path.resolve("data");

// In dev, serve the generated editions from ./data so the app reads the same files as production.
function serveData() {
  return {
    name: "serve-data",
    configureServer(server) {
      server.middlewares.use("/data", (req, res, next) => {
        const url = decodeURIComponent(req.url.split("?")[0]);
        if (url === "/editions/index.json") {
          const editions = fs
            .readdirSync(dataDir)
            .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
            .sort()
            .reverse()
            .map((name) => ({ date: name.replace(".json", "") }));
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify(editions));
        }
        // /latest.json and /editions/<date>.json both map to files in ./data
        const file = path.join(dataDir, path.basename(url));
        if (!fs.existsSync(file)) return next();
        res.setHeader("Content-Type", "application/json");
        fs.createReadStream(file).pipe(res);
      });
    }
  };
}

export default defineConfig({
  root: "web",
  base: "./",
  plugins: [react(), serveData()],
  build: { outDir: "../dist", emptyOutDir: true }
});
