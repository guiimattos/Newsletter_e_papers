export const feeds = [
  {
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    weight: 9,
    type: "news"
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    weight: 8,
    type: "news"
  },
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    weight: 8,
    type: "news"
  },
  {
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    weight: 8,
    type: "news"
  },
  {
    name: "Wired",
    url: "https://www.wired.com/feed/rss",
    weight: 7,
    type: "news"
  },
  {
    name: "IEEE Spectrum",
    url: "https://spectrum.ieee.org/rss/fulltext",
    weight: 8,
    type: "news"
  },
  {
    name: "Hacker News: Tech",
    url: "https://hnrss.org/newest?q=AI%20OR%20security%20OR%20semiconductor%20OR%20robotics%20OR%20cloud",
    weight: 5,
    type: "news"
  },
  {
    name: "Google News: AI",
    url: "https://news.google.com/rss/search?q=artificial%20intelligence%20technology%20when:2d&hl=en-US&gl=US&ceid=US:en",
    weight: 7,
    type: "news"
  },
  {
    name: "Google News: Semiconductors",
    url: "https://news.google.com/rss/search?q=semiconductor%20chips%20AI%20when:2d&hl=en-US&gl=US&ceid=US:en",
    weight: 7,
    type: "news"
  },
  {
    name: "Google News: Cybersecurity",
    url: "https://news.google.com/rss/search?q=cybersecurity%20technology%20when:2d&hl=en-US&gl=US&ceid=US:en",
    weight: 7,
    type: "news"
  },
  {
    name: "arXiv: Artificial Intelligence",
    url: "https://export.arxiv.org/rss/cs.AI",
    weight: 8,
    type: "paper"
  },
  {
    name: "arXiv: Machine Learning",
    url: "https://export.arxiv.org/rss/cs.LG",
    weight: 8,
    type: "paper"
  },
  {
    name: "arXiv: Cryptography and Security",
    url: "https://export.arxiv.org/rss/cs.CR",
    weight: 7,
    type: "paper"
  },
  {
    name: "arXiv: Robotics",
    url: "https://export.arxiv.org/rss/cs.RO",
    weight: 6,
    type: "paper"
  }
];

export const publisherWeights = [
  ["reuters", 10],
  ["associated press", 9],
  ["ap news", 9],
  ["bloomberg", 9],
  ["financial times", 8],
  ["the information", 8],
  ["mit technology review", 8],
  ["wired", 7],
  ["the verge", 7],
  ["ars technica", 7],
  ["techcrunch", 7],
  ["cnbc", 6],
  ["wsj", 6],
  ["yahoo finance", 4]
];

export const topicWeights = [
  ["artificial intelligence", 14],
  ["ai", 10],
  ["agent", 9],
  ["model", 8],
  ["openai", 10],
  ["anthropic", 10],
  ["google", 8],
  ["microsoft", 8],
  ["nvidia", 10],
  ["semiconductor", 9],
  ["chip", 8],
  ["cybersecurity", 10],
  ["security", 7],
  ["data breach", 8],
  ["ransomware", 8],
  ["regulation", 7],
  ["antitrust", 7],
  ["startup", 5],
  ["cloud", 6],
  ["quantum", 6],
  ["robot", 6],
  ["benchmark", 5],
  ["dataset", 5],
  ["reasoning", 7],
  ["inference", 6],
  ["alignment", 7],
  ["privacy", 7]
];
