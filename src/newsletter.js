import fs from "node:fs/promises";
import path from "node:path";
import Parser from "rss-parser";
import dayjs from "dayjs";
import { config } from "./config.js";
import { feeds, publisherWeights, topicWeights } from "./sources.js";

const parser = new Parser({
  timeout: 12000,
  headers: {
    "User-Agent": "OpenClaw-Tech-Newsletter/1.0"
  }
});

function normalizeUrl(url = "") {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "fbclid" || key === "gclid") {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function cleanText(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPublisherSuffix(title = "") {
  return title.replace(/\s[-–]\s[^-–]{2,60}$/u, "").trim();
}

function publisherBoost(item) {
  const text = `${item.source} ${item.title}`.toLowerCase();
  for (const [publisher, weight] of publisherWeights) {
    if (text.includes(publisher)) return weight;
  }
  return 0;
}

function scoreItem(item, sourceWeight) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  let score = sourceWeight + publisherBoost(item);

  for (const [topic, weight] of topicWeights) {
    if (text.includes(topic)) score += weight;
  }

  const ageHours = Math.max(0, dayjs().diff(dayjs(item.publishedAt), "hour"));
  score += Math.max(0, 28 - ageHours) / 4;

  if (text.includes("launch") || text.includes("announces") || text.includes("unveils")) {
    score += 4;
  }

  if (item.type === "paper") {
    score += 3;
    if (text.includes("survey") || text.includes("benchmark") || text.includes("dataset")) {
      score += 4;
    }
  }

  return Math.round(score * 10) / 10;
}

function makeInsight(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();

  if (item.type === "paper") {
    if (text.includes("benchmark") || text.includes("dataset")) {
      return "Paper util para acompanhar novos benchmarks, datasets e sinais tecnicos que podem virar produto.";
    }
    if (text.includes("security") || text.includes("privacy") || text.includes("attack")) {
      return "Pesquisa relevante para seguranca, privacidade e avaliacao de risco em sistemas reais.";
    }
    return "Pesquisa recente que pode antecipar tecnicas, arquiteturas ou limites que ainda nao chegaram ao mercado.";
  }
  if (text.includes("cyber") || text.includes("ransomware") || text.includes("breach")) {
    return "Impacto direto em risco operacional, resposta a incidentes e prioridades de defesa.";
  }
  if (text.includes("nvidia") || text.includes("chip") || text.includes("semiconductor")) {
    return "Sinal relevante para custo, disponibilidade e estrategia de infraestrutura de IA.";
  }
  if (text.includes("regulation") || text.includes("antitrust") || text.includes("government")) {
    return "Pode mudar regras de mercado, compliance e disponibilidade de produtos.";
  }
  if (text.includes("agent") || text.includes("model") || text.includes("openai") || text.includes("anthropic") || text.includes("google")) {
    return "Mostra a evolucao da camada de IA que devs e empresas vao usar no dia a dia.";
  }
  return "Vale acompanhar pelo impacto potencial em produto, mercado ou arquitetura tecnologica.";
}

function dedupe(items) {
  const seenUrls = new Set();
  const titleFingerprints = [];
  const result = [];

  for (const item of items) {
    const titleKey = stripPublisherSuffix(item.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const words = new Set(titleKey.split(" ").filter((word) => word.length > 3));
    const overlapsExisting = titleFingerprints.some((existing) => {
      const overlap = [...words].filter((word) => existing.has(word)).length;
      return words.size > 0 && overlap / Math.min(words.size, existing.size) >= 0.55;
    });

    if (seenUrls.has(item.url) || overlapsExisting) continue;
    seenUrls.add(item.url);
    titleFingerprints.push(words);
    result.push(item);
  }

  return result;
}

export async function fetchNews() {
  const batches = await Promise.allSettled(
    feeds.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return parsed.items.slice(0, 20).map((entry) => {
        const publishedAt = entry.isoDate || entry.pubDate || new Date().toISOString();
        const summary = cleanText(entry.contentSnippet || entry.content || entry.summary || "");
        const item = {
          title: cleanText(entry.title || "Sem titulo"),
          url: normalizeUrl(entry.link || entry.guid || ""),
          source: feed.name,
          type: feed.type || "news",
          publishedAt,
          summary: summary.slice(0, 260),
          insight: "",
          score: 0
        };
        item.score = scoreItem(item, feed.weight);
        item.insight = makeInsight(item);
        return item;
      });
    })
  );

  const items = batches.flatMap((batch) => (batch.status === "fulfilled" ? batch.value : []));
  return dedupe(items)
    .filter((item) => item.url && item.title)
    .sort((a, b) => b.score - a.score)
    .slice(0, config.maxItems);
}

export function buildNewsletter(items) {
  const generatedAt = new Date().toISOString();
  const topTopics = summarizeTopics(items);
  const news = items.filter((item) => item.type !== "paper");
  const papers = items.filter((item) => item.type === "paper");

  return {
    title: "OpenClaw Tech Brief",
    generatedAt,
    dateLabel: dayjs(generatedAt).format("DD/MM/YYYY HH:mm"),
    summary:
      "Briefing diario com noticias globais e papers recentes de tecnologia, ranqueados por relevancia, fonte e recencia.",
    topTopics,
    counts: {
      total: items.length,
      news: news.length,
      papers: papers.length
    },
    items,
    sections: {
      news,
      papers
    }
  };
}

function summarizeTopics(items) {
  const counts = new Map();
  for (const item of items) {
    const text = `${item.title} ${item.summary}`.toLowerCase();
    for (const [topic] of topicWeights) {
      if (text.includes(topic)) counts.set(topic, (counts.get(topic) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
}

export async function generateNewsletter() {
  await fs.mkdir(config.dataDir, { recursive: true });
  const items = await fetchNews();
  const newsletter = buildNewsletter(items);
  const todayPath = path.join(config.dataDir, `${dayjs().format("YYYY-MM-DD")}.json`);
  const latestPath = path.join(config.dataDir, "latest.json");

  await fs.writeFile(todayPath, JSON.stringify(newsletter, null, 2));
  await fs.writeFile(latestPath, JSON.stringify(newsletter, null, 2));

  return newsletter;
}

export async function readLatestNewsletter() {
  const latestPath = path.join(config.dataDir, "latest.json");
  try {
    const raw = await fs.readFile(latestPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return generateNewsletter();
  }
}
