import express from "express";
import cron from "node-cron";
import { config } from "./config.js";
import { generateNewsletter, readLatestNewsletter } from "./newsletter.js";

const app = express();

app.use(express.static("public"));

app.get("/api/newsletter", async (_req, res, next) => {
  try {
    res.json(await readLatestNewsletter());
  } catch (error) {
    next(error);
  }
});

app.post("/api/newsletter/generate", async (_req, res, next) => {
  try {
    res.json(await generateNewsletter());
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Nao foi possivel gerar a newsletter agora." });
});

const [hour, minute] = config.newsletterTime.split(":").map(Number);
cron.schedule(
  `${minute} ${hour} * * *`,
  async () => {
    try {
      await generateNewsletter();
      console.log(`[newsletter] generated daily briefing at ${new Date().toISOString()}`);
    } catch (error) {
      console.error("[newsletter] daily generation failed", error);
    }
  },
  { timezone: config.timezone }
);

app.listen(config.port, async () => {
  console.log(`Tech Newsletter running at http://localhost:${config.port}`);
  console.log(`Daily schedule: ${config.newsletterTime} (${config.timezone})`);
  await readLatestNewsletter();
});

