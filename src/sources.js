const googleNews = (query, lang = "en") =>
  lang === "pt"
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

// type: "news" | "startup" | "paper". kind defaults to "rss".
export const feeds = [
  // Tech news
  { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", weight: 9, type: "news" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", weight: 8, type: "news" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", weight: 8, type: "news" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", weight: 8, type: "news" },
  { name: "Wired", url: "https://www.wired.com/feed/rss", weight: 7, type: "news" },
  { name: "IEEE Spectrum", url: "https://spectrum.ieee.org/rss/fulltext", weight: 8, type: "news" },
  { name: "Hacker News", url: "https://hnrss.org/frontpage?points=150", weight: 7, type: "news" },
  { name: "Google News: IA", url: googleNews("artificial intelligence when:2d"), weight: 5, type: "news" },
  { name: "Google News: Chips", url: googleNews("semiconductor chips AI when:2d"), weight: 5, type: "news" },
  { name: "Google News: Cybersecurity", url: googleNews("cybersecurity breach OR vulnerability when:2d"), weight: 5, type: "news" },

  // Startups & venture
  { name: "TechCrunch Startups", url: "https://techcrunch.com/category/startups/feed/", weight: 9, type: "startup" },
  { name: "TechCrunch Venture", url: "https://techcrunch.com/category/venture/feed/", weight: 9, type: "startup" },
  { name: "Product Hunt", url: "https://www.producthunt.com/feed", weight: 4, type: "startup" },
  { name: "Startups.com.br", url: "https://startups.com.br/feed/", weight: 7, type: "startup" },
  {
    name: "Google News: Funding",
    url: googleNews('startup (raises OR funding OR "series a" OR "series b" OR "seed round") when:2d'),
    weight: 7,
    type: "startup"
  },
  {
    name: "Google News: Startups BR",
    url: googleNews("startup (rodada OR aporte OR investimento OR unicórnio) when:2d", "pt"),
    weight: 7,
    type: "startup"
  },

  // Papers: Hugging Face Daily Papers is community-curated (upvotes); arXiv is the fallback.
  { name: "Hugging Face Papers", url: "https://huggingface.co/api/daily_papers?limit=50", weight: 9, type: "paper", kind: "hf-papers" },
  { name: "arXiv: AI", url: "https://export.arxiv.org/rss/cs.AI", weight: 5, type: "paper" },
  { name: "arXiv: Machine Learning", url: "https://export.arxiv.org/rss/cs.LG", weight: 5, type: "paper" },
  { name: "arXiv: Security", url: "https://export.arxiv.org/rss/cs.CR", weight: 4, type: "paper" }
];

export const publisherWeights = [
  ["reuters", 10],
  ["associated press", 9],
  ["ap news", 9],
  ["bloomberg", 9],
  ["financial times", 8],
  ["the information", 8],
  ["mit technology review", 8],
  ["neofeed", 7],
  ["valor", 7],
  ["exame", 6],
  ["wired", 7],
  ["the verge", 7],
  ["ars technica", 7],
  ["techcrunch", 7],
  ["cnbc", 6],
  ["wsj", 6],
  ["yahoo finance", 2],
  ["motley fool", -15],
  ["benzinga", -8],
  ["zacks", -15]
];

// Matched as whole words (plural forms included). Negative weights push down noise.
export const topicWeights = [
  ["artificial intelligence", 10],
  ["ai", 6],
  ["llm", 7],
  ["agent", 6],
  ["openai", 8],
  ["anthropic", 8],
  ["claude", 6],
  ["gemini", 6],
  ["google", 4],
  ["microsoft", 4],
  ["apple", 4],
  ["meta", 4],
  ["nvidia", 7],
  ["semiconductor", 6],
  ["chip", 5],
  ["cybersecurity", 6],
  ["vulnerability", 5],
  ["data breach", 6],
  ["ransomware", 6],
  ["regulation", 5],
  ["antitrust", 5],
  ["startup", 6],
  ["raises", 6],
  ["funding", 5],
  ["series a", 6],
  ["series b", 6],
  ["seed round", 6],
  ["valuation", 5],
  ["unicorn", 6],
  ["acquires", 5],
  ["acquisition", 5],
  ["ipo", 6],
  ["y combinator", 6],
  ["venture capital", 5],
  ["rodada", 6],
  ["aporte", 6],
  ["investimento", 3],
  ["open source", 5],
  ["cloud", 3],
  ["quantum", 5],
  ["robot", 5],
  ["robotics", 5],
  ["reasoning", 5],
  ["benchmark", 4],
  ["dataset", 3],
  // noise
  ["etf", -20],
  ["stock forecast", -20],
  ["price prediction", -20],
  ["market index", -15],
  ["webinar", -12],
  ["sponsored", -15],
  ["deal", -6],
  ["deals", -10],
  ["coupon", -15],
  ["stock", -8],
  ["better buy", -15],
  ["shares", -3],
  ["review", -3]
];

// Signals that a "news" item is actually startup/venture news.
export const startupSignals = [
  "startup", "raises", "funding", "series a", "series b", "series c", "seed round", "valuation",
  "unicorn", "venture capital", "y combinator", "ipo", "rodada", "aporte", "unicórnio", "acquires"
];
