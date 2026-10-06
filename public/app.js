const dateLabel = document.querySelector("#dateLabel");
const summary = document.querySelector("#summary");
const topics = document.querySelector("#topics");
const newsCount = document.querySelector("#newsCount");
const paperCount = document.querySelector("#paperCount");
const startupCount = document.querySelector("#startupCount");
const startupList = document.querySelector("#startupList");
const highlights = document.querySelector("#highlights");
const newsList = document.querySelector("#newsList");
const paperList = document.querySelector("#paperList");
const refreshButton = document.querySelector("#refreshButton");
const template = document.querySelector("#newsCardTemplate");

async function loadNewsletter(generate = false) {
  refreshButton.disabled = true;
  refreshButton.querySelector("span").textContent = generate ? "Atualizando" : "Carregando";

  const response = await fetchNewsletter(generate);

  render(response);
  refreshButton.disabled = false;
  refreshButton.querySelector("span").textContent = "Atualizar";
}

async function fetchNewsletter(generate) {
  const apiPath = generate ? "api/newsletter/generate" : "api/newsletter";

  try {
    const response = await fetch(apiPath, { method: generate ? "POST" : "GET" });
    if (response.ok) return response.json();
  } catch {
    // Static GitHub Pages builds do not have the Express API.
  }

  if (generate) {
    throw new Error("Atualizacao ao vivo indisponivel no GitHub Pages. Rode npm run build para publicar uma nova edicao.");
  }
  // Static build: there is no API to regenerate, so hide the button.
  refreshButton.hidden = true;

  const staticResponse = await fetch("data/latest.json");
  if (!staticResponse.ok) {
    throw new Error("Falha ao carregar newsletter");
  }
  return staticResponse.json();
}

function render(newsletter) {
  dateLabel.textContent = `Atualizado em ${newsletter.dateLabel}`;
  summary.textContent = newsletter.summary;
  const sections = newsletter.sections || splitSections(newsletter.items || []);
  sections.startups ||= [];
  newsCount.textContent = `${sections.news.length} noticias`;
  startupCount.textContent = `${sections.startups.length} itens`;
  paperCount.textContent = `${sections.papers.length} papers`;

  const lines = newsletter.highlights || [];
  highlights.hidden = lines.length === 0;
  highlights.replaceChildren(
    ...lines.map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    })
  );

  topics.replaceChildren(
    ...(newsletter.topTopics.length ? newsletter.topTopics : ["tecnologia"]).map((topic) => {
      const chip = document.createElement("span");
      chip.textContent = topic;
      return chip;
    })
  );

  newsList.replaceChildren(...sections.news.map(renderItem));
  startupList.replaceChildren(...sections.startups.map(renderItem));
  paperList.replaceChildren(...sections.papers.map(renderItem));
}

function splitSections(items) {
  return {
    news: items.filter((item) => item.type !== "paper"),
    papers: items.filter((item) => item.type === "paper")
  };
}

const typeLabels = { news: "noticia", startup: "startup", paper: "paper" };

function renderItem(item) {
  const node = template.content.cloneNode(true);
  node.querySelector(".source").textContent = item.source;
  node.querySelector(".score").textContent = `score ${item.score}`;
  node.querySelector(".type").textContent = typeLabels[item.type] || "noticia";
  node.querySelector("h3").textContent = item.titlePt || item.title;
  if (item.titlePt) {
    const original = node.querySelector(".original-title");
    original.textContent = item.title;
    original.hidden = false;
  }
  node.querySelector(".summary").textContent = item.summary || "Sem resumo no feed.";
  node.querySelector(".insight").textContent = item.insight;
  node.querySelector("a").href = item.url;
  return node;
}

refreshButton.addEventListener("click", () => {
  loadNewsletter(true).catch(showError);
});

function showError(error) {
  refreshButton.disabled = false;
  refreshButton.querySelector("span").textContent = "Atualizar";
  summary.textContent = error.message;
}

loadNewsletter().catch(showError);
