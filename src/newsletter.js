import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import Parser from "rss-parser";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { config } from "./config.js";
import { feeds, publisherWeights, startupSignals, tagRules, techSignals, topicWeights } from "./sources.js";
import { generateEditorial } from "./ai.js";

dayjs.extend(utc);
dayjs.extend(timezone);

// Some publishers (Crunchbase) reject non-browser user agents.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

// Per-section rules: how old an item may be, and how much one source / one subject may repeat.
const SECTION_RULES = {
  news: { maxAgeHours: config.maxAgeHours, maxPerSource: 3, maxPerEntity: 2 },
  startup: { maxAgeHours: config.maxAgeHours, maxPerSource: 3, maxPerEntity: 2 },
  brasil: { maxAgeHours: config.maxAgeHours, maxPerSource: 2, maxPerEntity: 2 },
  read: { maxAgeHours: 24 * 7, maxPerSource: 1, maxPerEntity: Infinity },
  paper: { maxAgeHours: config.maxAgeHours * 2, maxPerSource: Infinity, maxPerEntity: Infinity },
  repo: { maxAgeHours: Infinity, maxPerSource: Infinity, maxPerEntity: Infinity }
};

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": USER_AGENT },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail"],
      ["content:encoded", "contentEncoded"]
    ]
  }
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
const techMatchers = techSignals.map(wordMatcher);

function makeId(url) {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
}

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

// Techmeme titles end with "(Publisher)".
function splitTechmeme(title = "") {
  const match = title.match(/^(.*?)\s*\(([^()]{2,60})\)\s*$/u);
  return match ? { title: match[1].trim(), publisher: match[2].split("/").pop().trim() } : { title, publisher: "" };
}

function truncate(text, size) {
  if (text.length <= size) return text;
  return `${text.slice(0, size).replace(/\s+\S*$/, "")}…`;
}

function parsePublishedAt(value = "") {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function pickImage(entry) {
  const candidates = [
    ...(entry.mediaContent || []).map((media) => media?.$?.url && (!media.$.medium || media.$.medium === "image") && media.$.url),
    entry.mediaThumbnail?.$?.url,
    entry.enclosure?.type?.startsWith("image") && entry.enclosure.url,
    (entry.contentEncoded || entry.content || "").match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
  ];
  const url = candidates.find((candidate) => typeof candidate === "string" && /^https:\/\//.test(candidate));
  // Tracking pixels and emoji are not useful thumbnails.
  return url && !/pixel|emoji|gravatar|feeds\.feedburner|1x1/i.test(url) ? url : "";
}

const MULTIPLIERS = { b: 1e9, bn: 1e9, billion: 1e9, bi: 1e9, bilhão: 1e9, bilhões: 1e9, m: 1e6, mn: 1e6, million: 1e6, mi: 1e6, milhão: 1e6, milhões: 1e6 };
const CURRENCIES = { "us$": "USD", $: "USD", "r$": "BRL", "€": "EUR", "£": "GBP" };

// "$189M Series B", "raises $1.2 billion", "R$ 50 milhões" -> { currency, amount, round }
export function extractFunding(text) {
  if (!/\b(raises?|raised|raising|funding|seed|series [a-f]|round|rodada|aporte|capta\w*|levanta)\b/i.test(text)) return null;
  const amounts = text.matchAll(
    /(US\$|R\$|\$|€|£)\s?(\d+(?:[.,]\d+)?)\s?(billion|bilhões|bilhão|million|milhões|milhão|bn|bi|mn|mi|b|m)(?![\p{L}])/giu
  );
  // "$40B valuation" / "at a $1.5B valuation" / "avaliada em US$ 2 bi" is not money raised.
  const match = [...amounts].find((candidate) => {
    const after = text.slice(candidate.index + candidate[0].length, candidate.index + candidate[0].length + 14);
    const before = text.slice(Math.max(0, candidate.index - 20), candidate.index);
    return !/^\+?\s*(valuation|valued|em bitcoin|in bitcoin)/i.test(after) && !/(valuation of|valued at|avaliad[ao] em|at a|worth)\s*$/i.test(before);
  });
  if (!match) return null;
  const amount = Number(match[2].replace(",", ".")) * MULTIPLIERS[match[3].toLowerCase()];
  const round = text.match(/\b(pre-seed|pré-seed|seed|series [a-f]|série [a-f])\b/i)?.[1] || "";
  return { currency: CURRENCIES[match[1].toLowerCase()], amount, round };
}

function tagsFor(text) {
  return tagRules.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag).slice(0, 3);
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
  if (item.section === "repo") return Math.round(Math.log2(1 + item.stars) * 10) / 10;

  const text = `${item.title} ${item.summary}`;
  let score = sourceWeight + publisherBoost(item);

  for (const [, weight] of matchedTopics(text)) score += weight;

  const ageHours = Math.max(0, dayjs().diff(dayjs(item.publishedAt), "hour"));
  if (item.section === "read") {
    score += Math.max(0, 168 - ageHours) / 12;
  } else {
    score += Math.max(0, 36 - ageHours) / 3;
  }

  if (/\b(launch(es|ed)?|announces|unveils|introduces|releases|lança|anuncia)\b/i.test(text)) score += 4;
  if (/\b(exclusive|breaking|exclusivo)\b/i.test(text)) score += 3;
  if (item.funding) score += Math.min(10, Math.log10(item.funding.amount) - 4);
  if (item.image) score += 1;

  if (item.section === "paper") {
    if (item.upvotes) score += Math.min(30, 6 * Math.log2(1 + item.upvotes));
    if (item.github) score += 3;
    if (/\b(benchmark|dataset|survey)\b/i.test(text)) score += 3;
  }

  if (item.points) score += Math.min(18, item.points / 25);
  // Techmeme's front page is already an editorial pick.
  if (item.feed === "Techmeme") score += 6;

  return Math.round(score * 10) / 10;
}

function makeInsight(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();

  if (item.section === "paper") {
    if (item.upvotes >= 20) return `Em alta na comunidade, com ${item.upvotes} upvotes no Hugging Face.`;
    if (/benchmark|dataset/.test(text)) return "Novo benchmark ou dataset, um sinal técnico que pode virar produto.";
    if (/security|privacy|attack|jailbreak/.test(text)) return "Pesquisa relevante para segurança e avaliação de risco em sistemas de IA.";
    if (item.github) return "Vem com código aberto, fácil de experimentar.";
    return "Pesquisa recente que pode antecipar técnicas que ainda não chegaram ao mercado.";
  }

  if (item.section === "repo") {
    return `${item.stars.toLocaleString("pt-BR")} estrelas em poucos dias${item.language ? `, escrito em ${item.language}` : ""}.`;
  }

  if (item.section === "read") return item.readingMinutes ? `Leitura de ${item.readingMinutes} min.` : "Análise para ler com calma.";

  // News insights come from the AI editorial; a canned sentence repeated on every item is noise.
  return "";
}

function finalizeItem(item, feed) {
  const text = `${item.title} ${item.summary}`;
  item.id = makeId(item.url);
  item.feed = feed.name;
  // News that is really about funding / M&A goes to the startups section.
  if (item.section === "news" && startupMatchers.some((matcher) => matcher.test(item.title))) {
    item.section = "startup";
  }
  if (item.section === "startup" || item.section === "brasil") {
    item.funding = extractFunding(text);
  }
  item.tags = item.section === "repo" || item.section === "paper" ? [] : tagsFor(text);
  item.score = scoreItem(item, feed.weight);
  item.insight = makeInsight(item);
  return item;
}

async function fetchRss(feed) {
  const response = await fetch(feed.url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const parsed = await parser.parseString((await response.text()).replace(/^\uFEFF/, "").trim());
  const items = parsed.items.slice(0, 30).map((entry) => {
    const isGoogleNews = feed.url.includes("news.google.com");
    const isTechmeme = feed.name === "Techmeme";
    const rawTitle = cleanText(entry.title);
    const { title, publisher } = isGoogleNews
      ? splitPublisher(rawTitle)
      : isTechmeme
        ? splitTechmeme(rawTitle)
        : { title: rawTitle, publisher: "" };

    let summary = cleanText(entry.contentSnippet || entry.summary || entry.content || "");
    if (feed.url.includes("arxiv.org")) summary = cleanArxivSummary(summary);
    // Google News and Techmeme snippets mostly repeat the headline.
    if (isGoogleNews) summary = "";
    let link = entry.link || entry.guid || "";
    if (isTechmeme) {
      // Link to the original article and keep only the lede after the em dash.
      const html = entry.content || "";
      // The headline link (inside <B>) points to the article; other links are the publisher's homepage.
      link = html.match(/<B><A HREF="(https?:\/\/[^"]+)"/i)?.[1] || link;
      summary = cleanText((html.match(/&mdash;(?:&nbsp;|\s)*([\s\S]*?)<\/P>/i)?.[1] || "").replace(/&hellip;/g, "…"));
    }

    const points = Number((entry.content || "").match(/Points:\s*(\d+)/)?.[1] || 0);
    // hnrss descriptions are only links and counters.
    if (feed.url.includes("hnrss.org")) summary = points ? `${points} pontos e discussão ativa no Hacker News.` : "";

    const fullText = cleanText(entry.contentEncoded || "");
    const readingMinutes = feed.section === "read" && fullText ? Math.max(1, Math.round(fullText.split(" ").length / 230)) : 0;

    return finalizeItem(
      {
        title: title || "Sem titulo",
        url: normalizeUrl(link),
        source: publisher || feed.name.replace(/^Google News: .*/, "Google News"),
        publisher,
        section: feed.section,
        publishedAt: parsePublishedAt(entry.isoDate || entry.pubDate || ""),
        summary: truncate(summary, 300),
        image: pickImage(entry),
        points,
        readingMinutes,
        author: entry.creator || entry.author || ""
      },
      feed
    );
  });

  return items.filter((item) => {
    const text = `${item.title} ${item.summary}`;
    if (feed.requireTech && !techMatchers.some((matcher) => matcher.test(text))) return false;
    if (feed.requireBrazil && !/brasil|brasileir|R\$|são paulo|nubank|ifood|mercado livre/i.test(`${text} ${item.source}`)) return false;
    return true;
  });
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, ...headers },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchHuggingFacePapers(feed) {
  const papers = await fetchJson(feed.url);
  return papers.map(({ paper, submittedOnDailyAt, publishedAt, thumbnail }) =>
    finalizeItem(
      {
        title: cleanText(paper.title),
        url: `https://huggingface.co/papers/${paper.id}`,
        source: feed.name,
        section: "paper",
        publishedAt: parsePublishedAt(paper.submittedOnDailyAt || submittedOnDailyAt || publishedAt),
        summary: truncate(cleanText(paper.ai_summary || paper.summary || ""), 300),
        image: thumbnail || "",
        upvotes: Number(paper.upvotes || 0),
        github: paper.githubRepo || "",
        authors: (paper.authors || []).slice(0, 3).map((author) => author.name),
        organization: paper.organization?.fullname || ""
      },
      feed
    )
  );
}

// Repos created in the last week, ranked by stars.
async function fetchGithubRepos(feed) {
  const since = dayjs().subtract(7, "day").format("YYYY-MM-DD");
  const url = `${feed.url}?q=${encodeURIComponent(`created:>${since}`)}&sort=stars&order=desc&per_page=30`;
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const { items = [] } = await fetchJson(url, headers);

  return items
    .filter((repo) => repo.description && !repo.fork)
    .map((repo) =>
      finalizeItem(
        {
          title: repo.full_name,
          url: repo.html_url,
          source: "GitHub",
          section: "repo",
          publishedAt: parsePublishedAt(repo.created_at),
          summary: truncate(cleanText(repo.description), 200),
          stars: repo.stargazers_count,
          language: repo.language || "",
          image: repo.owner?.avatar_url || ""
        },
        feed
      )
    );
}

function fetchFeed(feed) {
  if (feed.kind === "hf-papers") return fetchHuggingFacePapers(feed);
  if (feed.kind === "github") return fetchGithubRepos(feed);
  return fetchRss(feed);
}

const COMMON_WORDS = new Set(
  "with from that this about after their says said will have more into over what when which while where than they them".split(" ")
);

// Distinctive title words (singularized), flagged when written as a proper noun.
function titleTokens(title) {
  const tokens = new Map();
  for (const word of title.split(/[^\p{L}\p{N}]+/u)) {
    if (word.length < 4) continue;
    const key = word.toLowerCase().replace(/(?<=\p{L}{3})s$/u, "");
    if (COMMON_WORDS.has(key)) continue;
    tokens.set(key, tokens.get(key) || /^\p{Lu}/u.test(word));
  }
  return tokens;
}

function sameStory(a, b) {
  let shared = 0;
  let sharedProper = false;
  for (const [token, proper] of a) {
    if (!b.has(token)) continue;
    shared += 1;
    if (proper && b.get(token)) sharedProper = true;
  }
  return shared >= 2 && sharedProper;
}

function dedupe(items) {
  const seenUrls = new Set();
  const fingerprints = [];
  const titles = [];
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

    const tokens = titleTokens(item.title);
    const repeatsStory =
      item.section !== "paper" && item.section !== "repo" && titles.some((existing) => sameStory(tokens, existing));

    if (seenUrls.has(item.url) || overlapsExisting || repeatsStory) continue;
    seenUrls.add(item.url);
    fingerprints.push(words);
    titles.push(tokens);
    result.push(item);
  }

  return result;
}

const NOT_ENTITIES = new Set(
  `the this that these how why what when who new its it's is are was for with from and but not can will just
  says say said report here your you our ai a an to of in on at by as now all more after over into
  como para por com sem uma das dos nas nos que mais novo nova sobre após diz ia`.split(/\s+/)
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
function pickTop(items, limit, { maxPerSource, maxPerEntity }, taken = new Map()) {
  const perSource = new Map();
  const picked = [];
  for (const item of items) {
    const entities = [...titleEntities(item.title)];
    if ((perSource.get(item.source) || 0) >= maxPerSource) continue;
    if (entities.some((entity) => (taken.get(entity) || 0) >= maxPerEntity)) continue;
    perSource.set(item.source, (perSource.get(item.source) || 0) + 1);
    for (const entity of entities) taken.set(entity, (taken.get(entity) || 0) + 1);
    picked.push(item);
    if (picked.length >= limit) break;
  }
  return picked;
}

export async function fetchSections() {
  const results = await Promise.allSettled(feeds.map(fetchFeed));
  const failed = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      failed.push(feeds[index].name);
      console.warn(`[feeds] ${feeds[index].name} failed: ${result.reason?.message || result.reason}`);
    }
  });

  const now = dayjs();
  const fresh = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => item.url && item.title && item.score > 0)
    .filter((item) => now.diff(dayjs(item.publishedAt), "hour") <= SECTION_RULES[item.section].maxAgeHours);

  const ranked = dedupe(fresh.sort((a, b) => b.score - a.score));
  const bySection = (section) => ranked.filter((item) => item.section === section);
  const { quotas } = config;

  // The lead is the strongest tech story; prefer one with an image among the top three.
  const newsPool = bySection("news");
  const lead = newsPool.slice(0, 3).find((item) => item.image) || newsPool[0] || null;

  // News, startups and Brasil share the subject counter so one story does not fill every section.
  const taken = new Map();
  if (lead) for (const entity of titleEntities(lead.title)) taken.set(entity, 1);
  const news = pickTop(newsPool.filter((item) => item !== lead), quotas.news, SECTION_RULES.news, taken);
  const startups = pickTop(bySection("startup"), quotas.startups, SECTION_RULES.startup, taken);
  const brasil = pickTop(bySection("brasil"), quotas.brasil, SECTION_RULES.brasil, taken);

  return {
    lead,
    sections: {
      news,
      startups,
      brasil,
      reads: pickTop(bySection("read"), quotas.reads, SECTION_RULES.read),
      papers: pickTop(bySection("paper"), quotas.papers, SECTION_RULES.paper),
      repos: pickTop(bySection("repo"), quotas.repos, SECTION_RULES.repo)
    },
    sourceCount: new Set(fresh.map((item) => item.feed)).size,
    failed
  };
}

function summarizeTags(items) {
  const counts = new Map();
  for (const item of items) {
    for (const tag of item.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
}

// Items the editorial (and notifications) talk about, in a fixed order.
export function editionItems({ lead, sections }) {
  return [lead, ...sections.news, ...sections.startups, ...sections.brasil, ...sections.papers, ...sections.reads].filter(Boolean);
}

export function buildNewsletter(collected, editorial = null) {
  const generatedAt = new Date().toISOString();
  const { lead, sections } = collected;
  const items = editionItems(collected);

  if (editorial?.items) {
    for (const entry of editorial.items) {
      const item = items[entry.id];
      if (!item) continue;
      item.titlePt = entry.title;
      item.insight = entry.why || item.insight;
    }
  }

  const local = dayjs(generatedAt).tz(config.timezone);
  return {
    title: "OpenClaw Tech Brief",
    generatedAt,
    date: local.format("YYYY-MM-DD"),
    dateLabel: local.format("DD/MM/YYYY HH:mm"),
    summary:
      editorial?.intro ||
      "As principais notícias de tecnologia, startups e pesquisa das últimas 48 horas, escolhidas entre dezenas de fontes.",
    highlights: editorial?.highlights || [],
    tags: summarizeTags([...items, ...sections.repos]),
    stats: {
      news: sections.news.length + (lead ? 1 : 0),
      startups: sections.startups.length,
      brasil: sections.brasil.length,
      reads: sections.reads.length,
      papers: sections.papers.length,
      repos: sections.repos.length,
      rounds: [...sections.startups, ...sections.brasil].filter((item) => item.funding).length,
      sources: collected.sourceCount
    },
    lead,
    sections,
    // Flat list kept for notifications and older consumers.
    items: [...items, ...sections.repos],
    counts: { total: items.length + sections.repos.length }
  };
}

export async function generateNewsletter() {
  await fs.mkdir(config.dataDir, { recursive: true });
  const collected = await fetchSections();
  const editorial = await generateEditorial(editionItems(collected));
  const newsletter = buildNewsletter(collected, editorial);

  const json = JSON.stringify(newsletter, null, 2);
  await fs.writeFile(path.join(config.dataDir, `${newsletter.date}.json`), json);
  await fs.writeFile(path.join(config.dataDir, "latest.json"), json);

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
