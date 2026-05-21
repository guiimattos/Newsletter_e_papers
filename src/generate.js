import { generateNewsletter } from "./newsletter.js";

const newsletter = await generateNewsletter();
console.log(`Generated ${newsletter.items.length} items at ${newsletter.generatedAt}`);
process.exit(0);
