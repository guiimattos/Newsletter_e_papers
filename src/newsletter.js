import fs from "node:fs/promises";
import path from "node:path";
import Parser from "rss-parser";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { config } from "./config.js";
import { feeds, publisherWeights, startupSignals, topicWeights } from "./sources.js";
import { generateEditorial } from "./ai.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const USER_AGENT = "Mozilla/5.0 (compatible; OpenClaw-Tech-Newsletter/2.0)";
const MAX_PER_SOURCE = 3;

const parser = new Parser({
  timeout: 12000,
  headers: { "User-Agent": USER_AGENT }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word matcher so "ai" does not match "said" or "again"; accepts simple plurals.
function wordMatcher(term) {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(term)}(?:s|es)?(?![\\p{L}\\p{N}])`, "iu");
}

const topicMatchers = topicWeights.map(([topic, weight]) => [topic, weight, wordMatcher(topic)]);
const startupMatchers = startupSignals.map(wordMatcher);

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
    .replace(/&#0?39;|&#8217;|&#8216;/g, "'")
    .replace(/&quot;|&#8220;|&#8221;/g, '"')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&#8211;|&#8212;/g, "–")
    .replace(/&#8230;/g, "…")
    .replace(/\s+/g, " ")
    .trim();
}

// arXiv summaries start with "arXiv:2605.12345v1 Announce Type: new Abstract: ..."
function cleanArxivSummary(summary) {
  return summary.replace(/^arXiv:\S+\s+Announce Type:\s*\S+\s+Abstract:\s*/i, "");
}

// Google News titles look like "Headline - Publisher".
function splitPublisher(title = "") {
  const match = title.match(/^(.*)\s[-–]\s([^-–]{2,60})$/u);
  return match ? { title: match[1].trim(), publisher: match[2].trim() } : { title, publisher: "" };
}

function truncate(text, size) {
  if (text.length <= size) return text;
  return `${text.slice(0, size).replace(/\s+\S*$/, "")}…`;
}

function parsePublishedAt(value = "") {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function matchedTopics(text) {
  return topicMatchers.filter(([, , matcher]) => matcher.test(text));
}

function publisherBoost(item) {
  const text = `${item.source} ${item.publisher || ""}`.toLowerCase();
  for (const [publisher, weight] of publisherWeights) {
    if (text.includes(publisher)) return weight;
  }
  return 0;
}

function scoreItem(item, sourceWeight) {
  const text = `${item.title} ${item.summary}`;
  let score = sourceWeight + publisherBoost(item);

  for (const [, weight] of matchedTopics(text)) score += weight;

  const ageHours = Math.max(0, dayjs().diff(dayjs(item.publishedAt), "hour"));
  score += Math.max(0, 36 - ageHours) / 3;

  if (/\b(launch(es|ed)?|announces|unveils|introduces|releases)\b/i.test(text)) score += 4;
  if (/\b(exclusive|breaking)\b/i.test(text)) score += 3;

  if (item.type === "paper") {
    if (item.upvotes) score += Math.min(30, 6 * Math.log2(1 + item.upvotes));
    if (item.github) score += 3;
    if (/\b(benchmark|dataset|survey)\b/i.test(text)) score += 3;
  }

  if (item.points) score += Math.min(18, item.points / 25);

  return Math.round(score * 10) / 10;
}

function makeInsight(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();

  if (item.type === "paper") {
    if (item.upvotes >= 20) return `Paper em alta na comunidade (${item.upvotes} upvotes no Hugging Face).`;
    if (/benchmark|dataset/.test(text)) return "Novo benchmark ou dataset — sinal tecnico que pode virar produto.";
    if (/security|privacy|attack|jailbreak/.test(text)) return "Pesquisa relevante para seguranca e avaliacao de risco em sistemas de IA.";
    if (item.github) return "Vem com codigo aberto — facil de experimentar.";
    return "Pesquisa recente que pode antecipar tecnicas e arquiteturas que ainda nao chegaram ao mercado.";
  }

  if (item.type === "startup") {
    if (/\b(ipo)\b/.test(text)) return "Abertura de capital: termometro do apetite do mercado por tech.";
    if (/acquir|acquisition|aquisi/.test(text)) return "Movimento de M&A — mostra quem esta consolidando o mercado.";
    if (/series [b-z]|unicorn|unicórnio|valuation/.test(text)) return "Rodada grande: indica onde o capital de risco esta apostando.";
    if (/raises|funding|seed|series a|rodada|aporte/.test(text)) return "Rodada de investimento — vale ver o problema que essa startup resolve.";
    if (item.source === "Product Hunt") return "Lancamento de produto em destaque na comunidade.";
    return "Movimento relevante no ecossistema de startups.";
  }

  if (/cyber|ransomware|breach|vulnerab/.test(text)) return "Impacto direto em risco operacional e prioridades de seguranca.";
  if (/nvidia|chip|semiconductor/.test(text)) return "Sinal sobre custo e disponibilidade de infraestrutura de IA.";
  if (/regulat|antitrust|government|lawsuit/.test(text)) return "Pode mudar regras de mercado, compliance e disponibilidade de produtos.";
  if (/\b(ai|agent|model|openai|anthropic|gemini|llm)\b/.test(text)) return "Mostra a evolucao da camada de IA que devs e empresas usam no dia a dia.";
  if (/quantum|robot|drone/.test(text)) return "Tecnologia que pode mudar a competitividade de hardware.";
  return "Vale acompanhar pelo impacto em produto, mercado ou arquitetura.";
}

function finalizeItem(item, feed) {
  // News that is really about funding / M&A goes to the startups section.
  if (item.type === "news" && startupMatchers.some((matcher) => matcher.test(item.title))) {
    item.type = "startup";
  }
  item.score = scoreItem(item, feed.weight);
  item.insight = makeInsight(item);
  return item;
}

async function fetchRss(feed) {
  const parsed = await parser.parseURL(feed.url);
  return parsed.items.slice(0, 25).map((entry) => {
    const isGoogleNews = feed.url.includes("news.google.com");
    const { title, publisher } = isGoogleNews
      ? splitPublisher(cleanText(entry.title))
      : { title: cleanText(entry.title), publisher: "" };
    let summary = cleanText(entry.contentSnippet || entry.content || entry.summary || "");
    if (feed.url.includes("arxiv.org")) summary = cleanArxivSummary(summary);
    // Google News snippets just repeat the headline.
    if (isGoogleNews) summary = "";
    const points = Number((entry.content || "").match(/Points:\s*(\d+)/)?.[1] || 0);
    // hnrss descriptions are only links and counters.
    if (feed.url.includes("hnrss.org")) summary = points ? `${points} pontos no Hacker News.` : "";

    return finalizeItem(
      {
        title: title || "Sem titulo",
        url: normalizeUrl(entry.link || entry.guid || ""),
        source: publisher || feed.name,
        publisher,
        type: feed.type,
        publishedAt: parsePublishedAt(entry.isoDate || entry.pubDate || ""),
        summary: truncate(summary, 280),
        points
      },
      feed
    );
  });
}

async function fetchHuggingFacePapers(feed) {
  const response = await fetch(feed.url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const papers = await response.json();

  return papers.map(({ paper, submittedOnDailyAt, publishedAt }) =>
    finalizeItem(
      {
        title: cleanText(paper.title),
        url: `https://huggingface.co/papers/${paper.id}`,
        source: feed.name,
        type: "paper",
        publishedAt: parsePublishedAt(paper.submittedOnDailyAt || submittedOnDailyAt || publishedAt),
        summary: truncate(cleanText(paper.ai_summary || paper.summary || ""), 280),
        upvotes: Number(paper.upvotes || 0),
        github: paper.githubRepo || ""
      },
      feed
    )
  );
}

function fetchFeed(feed) {
  return feed.kind === "hf-papers" ? fetchHuggingFacePapers(feed) : fetchRss(feed);
}

function dedupe(items) {
  const seenUrls = new Set();
  const fingerprints = [];
  const result = [];

  for (const item of items) {
    const words = new Set(
      `${item.title} ${item.summary.slice(0, 120)}`
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word.length > 3)
    );

    const overlapsExisting = fingerprints.some((existing) => {
      const overlap = [...words].filter((word) => existing.has(word)).length;
      return words.size > 0 && overlap / Math.min(words.size, existing.size) >= 0.55;
    });

    if (seenUrls.has(item.url) || overlapsExisting) continue;
    seenUrls.add(item.url);
    fingerprints.push(words);
    result.push(item);
  }

  return result;
}

const NOT_ENTITIES = new Set(
  `the this that these how why what when who new its it's is are was for with from and but not can will just
  says say said report here your you our ai a an to of in on at by as now all more after over into`.split(/\s+/)
);

// Capitalized words in a title ("Mistral", "Nvidia") approximate the story's subject.
function titleEntities(title) {
  return new Set(
    (title.match(/\p{Lu}[\p{L}\p{N}'’]+/gu) || [])
      .map((word) => word.replace(/['’]s$/, "").toLowerCase())
      .filter((word) => word.length > 2 && !NOT_ENTITIES.has(word))
  );
}

// Keeps the best items while avoiding one source or one subject dominating a section.
function pickTop(items, limit, { maxPerSource = MAX_PER_SOURCE, maxPerEntity = 2 } = {}) {
  const perSource = new Map();
  const perEntity = new Map();
  const picked = [];
  for (const item of items) {
    const entities = [...titleEntities(item.title)];
    if ((perSource.get(item.source) || 0) >= maxPerSource) continue;
    if (entities.some((entity) => (perEntity.get(entity) || 0) >= maxPerEntity)) continue;
    perSource.set(item.source, (perSource.get(item.source) || 0) + 1);
    for (const entity of entities) perEntity.set(entity, (perEntity.get(entity) || 0) + 1);
    picked.push(item);
    if (picked.length >= limit) break;
  }
  return picked;
}

export async function fetchSections() {
  const results = await Promise.allSettled(feeds.map(fetchFeed));
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn(`[feeds] ${feeds[index].name} failed: ${result.reason?.message || result.reason}`);
    }
  });

  const now = dayjs();
  const fresh = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => item.url && item.title && item.score > 0)
    .filter((item) => {
      const maxAge = item.type === "paper" ? config.maxAgeHours * 2 : config.maxAgeHours;
      return now.diff(dayjs(item.publishedAt), "hour") <= maxAge;
    });

  const ranked = dedupe(fresh.sort((a, b) => b.score - a.score));

  return {
    news: pickTop(ranked.filter((item) => item.type === "news"), config.quotas.news),
    startups: pickTop(ranked.filter((item) => item.type === "startup"), config.quotas.startups),
    papers: pickTop(ranked.filter((item) => item.type === "paper"), config.quotas.papers, {
      maxPerSource: Infinity,
      maxPerEntity: Infinity
    })
  };
}

function summarizeTopics(items) {
  const counts = new Map();
  for (const item of items) {
    for (const [topic, weight] of matchedTopics(`${item.title} ${item.summary}`)) {
      if (weight <= 0) continue;
      counts.set(topic, (counts.get(topic) || 0) + weight + item.score * 0.1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([topic]) => topic);
}

export function buildNewsletter(sections, editorial = null) {
  const generatedAt = new Date().toISOString();
  const items = [...sections.news, ...sections.startups, ...sections.papers];

  if (editorial?.items) {
    for (const entry of editorial.items) {
      const item = items[entry.id];
      if (!item) continue;
      item.titlePt = entry.title;
      item.insight = entry.why || item.insight;
    }
  }

  return {
    title: "OpenClaw Tech Brief",
    generatedAt,
    dateLabel: dayjs(generatedAt).tz(config.timezone).format("DD/MM/YYYY HH:mm"),
    summary:
      editorial?.intro ||
      "Briefing diario com as principais noticias de tecnologia, startups e papers, ranqueados por relevancia, fonte e recencia.",
    highlights: editorial?.highlights || [],
    topTopics: summarizeTopics(items),
    counts: {
      total: items.length,
      news: sections.news.length,
      startups: sections.startups.length,
      papers: sections.papers.length
    },
    items,
    sections
  };
}

export async function generateNewsletter() {
  await fs.mkdir(config.dataDir, { recursive: true });
  const sections = await fetchSections();
  const items = [...sections.news, ...sections.startups, ...sections.papers];
  const editorial = await generateEditorial(items);
  const newsletter = buildNewsletter(sections, editorial);

  const todayPath = path.join(config.dataDir, `${dayjs().tz(config.timezone).format("YYYY-MM-DD")}.json`);
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
