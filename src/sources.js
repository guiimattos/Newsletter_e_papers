const googleNews = (query, lang = "en") =>
  lang === "pt"
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

/**
 * section: where the item lands in the edition.
 *   news     -> Tech
 *   startup  -> Startups & venture
 *   brasil   -> Brasil
 *   read     -> Para ler com calma (essays / analysis)
 *   paper    -> Papers
 *   repo     -> Repos em alta (GitHub)
 * kind defaults to "rss".
 */
export const feeds = [
  // Tech
  { name: "Techmeme", url: "https://www.techmeme.com/feed.xml", weight: 10, section: "news" },
  { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", weight: 9, section: "news" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", weight: 8, section: "news" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", weight: 8, section: "news" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", weight: 8, section: "news" },
  { name: "Wired", url: "https://www.wired.com/feed/rss", weight: 7, section: "news" },
  { name: "IEEE Spectrum", url: "https://spectrum.ieee.org/rss/fulltext", weight: 7, section: "news" },
  { name: "Rest of World", url: "https://restofworld.org/feed/latest", weight: 7, section: "news" },
  { name: "404 Media", url: "https://www.404media.co/rss/", weight: 7, section: "news" },
  { name: "Hacker News", url: "https://hnrss.org/frontpage?points=150", weight: 7, section: "news" },
  { name: "OpenAI", url: "https://openai.com/news/rss.xml", weight: 8, section: "news" },
  { name: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", weight: 8, section: "news" },
  { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", weight: 6, section: "news" },
  { name: "Google News: IA", url: googleNews("artificial intelligence when:2d"), weight: 4, section: "news" },
  { name: "Google News: Chips", url: googleNews("semiconductor chips AI when:2d"), weight: 4, section: "news" },

  // Startups & venture
  { name: "TechCrunch Startups", url: "https://techcrunch.com/category/startups/feed/", weight: 9, section: "startup" },
  { name: "TechCrunch Venture", url: "https://techcrunch.com/category/venture/feed/", weight: 9, section: "startup" },
  { name: "Crunchbase News", url: "https://news.crunchbase.com/feed/", weight: 9, section: "startup" },
  { name: "Sifted", url: "https://sifted.eu/feed/", weight: 7, section: "startup" },
  { name: "Y Combinator", url: "https://www.ycombinator.com/blog/rss/", weight: 6, section: "startup" },
  { name: "Product Hunt", url: "https://www.producthunt.com/feed", weight: 3, section: "startup" },
  {
    name: "Google News: Funding",
    url: googleNews('startup (raises OR funding OR "series a" OR "series b" OR "seed round") when:2d'),
    weight: 6,
    section: "startup"
  },

  // Brasil
  { name: "Neofeed", url: "https://neofeed.com.br/feed/", weight: 9, section: "brasil" },
  { name: "Brazil Journal", url: "https://braziljournal.com/feed/", weight: 8, section: "brasil", requireTech: true },
  { name: "Startups.com.br", url: "https://startups.com.br/feed/", weight: 8, section: "brasil" },
  { name: "Tecnoblog", url: "https://tecnoblog.net/feed/", weight: 7, section: "brasil" },
  { name: "Canaltech", url: "https://canaltech.com.br/rss/", weight: 5, section: "brasil" },
  {
    name: "Google News: Startups BR",
    url: googleNews("startup (rodada OR aporte OR investimento OR unicórnio) when:2d", "pt"),
    weight: 6,
    section: "brasil",
    requireBrazil: true
  },

  // Para ler com calma
  { name: "Stratechery", url: "https://stratechery.com/feed/", weight: 9, section: "read" },
  { name: "Benedict Evans", url: "https://www.ben-evans.com/benedictevans?format=rss", weight: 9, section: "read" },
  { name: "The Pragmatic Engineer", url: "https://newsletter.pragmaticengineer.com/feed", weight: 8, section: "read" },
  { name: "Simon Willison", url: "https://simonwillison.net/atom/entries/", weight: 8, section: "read" },
  { name: "Platformer", url: "https://www.platformer.news/rss/", weight: 8, section: "read" },
  { name: "Import AI", url: "https://importai.substack.com/feed", weight: 8, section: "read" },
  { name: "One Useful Thing", url: "https://www.oneusefulthing.org/feed", weight: 8, section: "read" },
  { name: "Interconnects", url: "https://www.interconnects.ai/feed", weight: 7, section: "read" },
  { name: "Latent Space", url: "https://www.latent.space/feed", weight: 7, section: "read" },
  { name: "Not Boring", url: "https://www.notboring.co/feed", weight: 7, section: "read" },

  // Papers: Hugging Face Daily Papers is community-curated (upvotes); arXiv is the fallback.
  { name: "Hugging Face Papers", url: "https://huggingface.co/api/daily_papers?limit=50", weight: 9, section: "paper", kind: "hf-papers" },
  { name: "arXiv: AI", url: "https://export.arxiv.org/rss/cs.AI", weight: 4, section: "paper" },
  { name: "arXiv: Machine Learning", url: "https://export.arxiv.org/rss/cs.LG", weight: 4, section: "paper" },

  // Repos
  { name: "GitHub", url: "https://api.github.com/search/repositories", weight: 0, section: "repo", kind: "github" }
];

export const publisherWeights = [
  ["reuters", 10],
  ["associated press", 9],
  ["ap news", 9],
  ["bloomberg", 9],
  ["financial times", 8],
  ["the information", 8],
  ["mit technology review", 8],
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
  ["inteligência artificial", 8],
  ["ai", 6],
  ["ia", 4],
  ["llm", 7],
  ["agent", 6],
  ["openai", 8],
  ["anthropic", 8],
  ["claude", 6],
  ["gemini", 6],
  ["mistral", 5],
  ["deepseek", 6],
  ["google", 4],
  ["microsoft", 4],
  ["apple", 4],
  ["meta", 4],
  ["amazon", 3],
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
  ["capta", 5],
  ["unicórnio", 6],
  ["fintech", 4],
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
  ["patrocinado", -15],
  ["deal", -6],
  ["deals", -10],
  ["coupon", -15],
  ["cupom", -15],
  ["oferta", -8],
  ["promoção", -10],
  ["black friday", -10],
  ["horóscopo", -30],
  ["stock", -8],
  ["better buy", -15],
  ["buy and hold", -20],
  ["stocks to buy", -20],
  ["should you buy", -20],
  ["como usar", -10],
  ["veja como", -10],
  ["dicas", -8],
  ["tutorial", -8],
  ["how to", -6],
  ["shares", -3],
  ["review", -3]
];

// Signals that a "news" item is actually startup/venture news.
export const startupSignals = [
  "startup", "raises", "funding", "series a", "series b", "series c", "seed round", "valuation",
  "unicorn", "venture capital", "y combinator", "ipo", "acquires"
];

// Feeds with requireTech only keep items that mention one of these.
export const techSignals = [
  "tecnologia", "tech", "startup", "software", "ia", "inteligência artificial", "fintech", "venture",
  "rodada", "aporte", "unicórnio", "app", "dados", "nuvem", "chip", "big tech", "investimento"
];

// Topic tags shown as chips (pattern tested against title + summary).
export const tagRules = [
  ["IA", /\b(ai|a\.i\.|ia|llm|gpt|openai|anthropic|claude|gemini|deepmind|mistral|deepseek|machine learning|neural|agentes?|agents?|inteligência artificial|artificial intelligence|modelos? de linguagem)\b/i],
  ["Chips", /\b(chips?|semiconductors?|nvidia|tsmc|amd|intel|gpus?|asml)\b/i],
  ["Segurança", /\b(security|cyber\w*|breach|hack\w*|ransomware|vulnerabilit\w*|malware|segurança|vazamento|ataque)\b/i],
  ["Big Tech", /\b(apple|google|alphabet|microsoft|amazon|meta|facebook|instagram|whatsapp|tesla)\b/i],
  ["Regulação", /\b(regulat\w*|antitrust|lawsuit|court|ftc|doj|lei|regulação|anpd|cade|stf|congress)\b/i],
  ["Rodada", /\b(raises?|raised|funding|seed|series [a-f]|rodada|aporte|capta\w*|valuation)\b/i],
  ["M&A", /\b(acquires?|acquisition|acquired|merger|aquisição|adquire)\b/i],
  ["Dev", /\b(developers?|programming|github|open[- ]source|javascript|python|rust|devs?)\b/i],
  ["Hardware", /\b(iphone|pixel|galaxy|laptop|smartphone|headset|wearable|vision pro|celular)\b/i],
  ["Espaço", /\b(spacex|nasa|rocket|satellite|starlink|orbit|foguete|satélite)\b/i],
  ["Energia", /\b(battery|batteries|solar|nuclear|electric vehicles?|climate|energia|bateria)\b/i],
  ["Cripto", /\b(crypto\w*|bitcoin|ethereum|stablecoins?|blockchain|cripto\w*)\b/i]
];
