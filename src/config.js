import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").trim();
    }
  }
}

export const config = {
  port: Number(process.env.PORT || 4321),
  newsletterTime: process.env.NEWSLETTER_TIME || "08:00",
  timezone: process.env.NEWSLETTER_TIMEZONE || "America/Sao_Paulo",
  maxItems: Number(process.env.NEWSLETTER_MAX_ITEMS || 14),
  dataDir: path.resolve(process.cwd(), "data")
};
