export const SECTIONS = [
  {
    key: "news",
    label: "Tech",
    color: "var(--c-tech)",
    blurb: "O que movimentou tecnologia nas últimas 48 horas, em ordem de relevância."
  },
  {
    key: "startups",
    label: "Startups",
    color: "var(--c-startup)",
    blurb: "Rodadas, aquisições, IPOs e lançamentos no ecossistema de venture."
  },
  {
    key: "brasil",
    label: "Brasil",
    color: "var(--c-brasil)",
    blurb: "Tecnologia e startups no Brasil."
  },
  {
    key: "papers",
    label: "Papers",
    color: "var(--c-paper)",
    blurb: "Pesquisas mais votadas hoje pela comunidade no Hugging Face."
  },
  {
    key: "repos",
    label: "Repos",
    color: "var(--c-repo)",
    blurb: "Projetos criados nesta semana que mais ganharam estrelas no GitHub."
  },
  {
    key: "reads",
    label: "Leituras",
    color: "var(--c-read)",
    blurb: "Análises e ensaios para ler com calma."
  }
];

const EMPTY_SECTIONS = { news: [], startups: [], brasil: [], papers: [], repos: [], reads: [] };

// Older editions (before the redesign) had no lead and fewer sections.
export function normalizeEdition(raw, fileDate = "") {
  const sections = { ...EMPTY_SECTIONS, ...(raw.sections || {}) };
  let lead = raw.lead || null;
  if (!lead && sections.news.length) {
    [lead, ...sections.news] = sections.news;
    sections.news = sections.news.slice();
  }
  return {
    ...raw,
    lead,
    sections,
    tags: raw.tags || [],
    highlights: raw.highlights || [],
    date: raw.date || fileDate || raw.generatedAt?.slice(0, 10),
    stats: raw.stats || {
      news: sections.news.length + (lead ? 1 : 0),
      startups: sections.startups.length,
      papers: sections.papers.length,
      sources: 0
    }
  };
}

export async function loadEdition(date) {
  const url = date ? `data/editions/${date}.json` : "data/latest.json";
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`A edição ${date || "de hoje"} não foi encontrada.`);
  return normalizeEdition(await response.json(), date);
}

export async function loadArchive() {
  try {
    const response = await fetch("data/editions/index.json", { cache: "no-cache" });
    return response.ok ? response.json() : [];
  } catch {
    return [];
  }
}

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export function timeAgo(iso) {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

const SYMBOLS = { USD: "US$", BRL: "R$", EUR: "€", GBP: "£" };

export function formatFunding(funding) {
  if (!funding) return "";
  const { amount, currency } = funding;
  const value = amount >= 1e9 ? amount / 1e9 : amount / 1e6;
  const unit = amount >= 1e9 ? "bi" : "mi";
  const number = value.toLocaleString("pt-BR", { maximumFractionDigits: value < 10 ? 1 : 0 });
  return `${SYMBOLS[currency] || ""} ${number} ${unit}`.trim();
}

export function formatRound(round = "") {
  return round.replace(/^series/i, "Série").replace(/^seed$/i, "Seed").replace(/^pre-seed$/i, "Pré-seed");
}

export function formatDay(date) {
  const day = new Date(`${date}T12:00:00`);
  return {
    weekday: day.toLocaleDateString("pt-BR", { weekday: "long" }),
    long: day.toLocaleDateString("pt-BR", { day: "numeric", month: "long" }),
    short: day.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
  };
}

export function matches(item, query, tag) {
  if (tag && !(item.tags || []).includes(tag)) return false;
  if (!query) return true;
  const haystack = `${item.titlePt || ""} ${item.title} ${item.summary} ${item.source} ${(item.tags || []).join(" ")}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
