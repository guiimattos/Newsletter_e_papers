import { generateNewsletter, readLatestNewsletter } from "./newsletter.js";
import { notifyAll } from "./notify.js";

// Usage: node src/send.js            -> sends data/latest.json
//        node src/send.js --generate -> generates a fresh edition, then sends it
const newsletter = process.argv.includes("--generate") ? await generateNewsletter() : await readLatestNewsletter();
const results = await notifyAll(newsletter);

process.exit(results.length && results.every((result) => !result.ok) ? 1 : 0);
