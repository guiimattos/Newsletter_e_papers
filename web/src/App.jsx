import { useEffect, useMemo, useState } from "react";
import Hero from "./components/Hero.jsx";
import { BrasilList, Lead, NewsList, PaperGrid, ReadsList, RepoGrid, StartupList } from "./components/Sections.jsx";
import { SECTIONS, loadArchive, loadEdition, matches } from "./lib/edition.js";

const LISTS = {
  news: NewsList,
  startups: StartupList,
  brasil: BrasilList,
  papers: PaperGrid,
  repos: RepoGrid,
  reads: ReadsList
};

// The chosen edition lives in ?edicao=YYYY-MM-DD so section anchors (#secao-x) keep working.
function dateFromUrl() {
  const date = new URLSearchParams(window.location.search).get("edicao") || "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

export default function App() {
  const [edition, setEdition] = useState(null);
  const [error, setError] = useState("");
  const [archive, setArchive] = useState([]);
  const [requested, setRequested] = useState(dateFromUrl);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");

  useEffect(() => {
    loadArchive().then(setArchive);
    const onPop = () => setRequested(dateFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    setError("");
    loadEdition(requested)
      .then((data) => {
        setEdition(data);
        setQuery("");
        setTag("");
      })
      .catch((reason) => setError(reason.message));
  }, [requested]);

  const pickEdition = (date) => {
    history.pushState(null, "", date ? `?edicao=${date}` : window.location.pathname);
    setRequested(date);
    window.scrollTo({ top: 0 });
  };

  const toggleTag = (value) => setTag((current) => (current === value ? "" : value));

  const filtered = useMemo(() => {
    if (!edition) return null;
    const sections = Object.fromEntries(
      Object.entries(edition.sections).map(([key, items]) => [key, items.filter((item) => matches(item, query, tag))])
    );
    const lead = edition.lead && matches(edition.lead, query, tag) ? edition.lead : null;
    return { lead, sections };
  }, [edition, query, tag]);

  if (error && !edition) {
    return (
      <main className="state">
        <h1>Edição indisponível</h1>
        <p>{error}</p>
        <p>Rode <code>npm run generate</code> para criar a primeira edição.</p>
      </main>
    );
  }

  if (!edition) {
    return (
      <main className="state" aria-busy="true">
        <p>Carregando a edição…</p>
      </main>
    );
  }

  const filtering = Boolean(query || tag);
  const visibleSections = SECTIONS.filter(({ key }) => filtered.sections[key]?.length);
  const nothingFound = filtering && !filtered.lead && visibleSections.length === 0;

  return (
    <>
      <Hero edition={edition} archive={archive} onPickEdition={pickEdition} isLatest={!requested} />

      <nav className="toolbar" aria-label="Seções">
        <div className="toolbar-inner">
          <ul className="section-links">
            {SECTIONS.filter(({ key }) => edition.sections[key]?.length).map(({ key, label, color }) => (
              <li key={key}>
                <a href={`#secao-${key}`} style={{ "--dot": color }}>
                  {label}
                  <span className="count">{filtered.sections[key]?.length ?? 0}</span>
                </a>
              </li>
            ))}
          </ul>
          <label className="search">
            <span className="visually-hidden">Buscar nesta edição</span>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="m14 14 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Buscar: OpenAI, rodada, Nubank…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        {edition.tags.length > 0 && (
          <div className="topic-bar">
            <span className="topic-label">Temas</span>
            <ul>
              {edition.tags.slice(0, 10).map(({ tag: name, count }) => (
                <li key={name}>
                  <button
                    type="button"
                    className={tag === name ? "is-active" : ""}
                    aria-pressed={tag === name}
                    onClick={() => toggleTag(name)}
                  >
                    {name} <span>{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <main className="page">
        {filtering && (
          <p className="filter-note" role="status">
            {nothingFound ? "Nada encontrado nesta edição" : "Mostrando só o que corresponde"}
            {query && <> a “{query}”</>}
            {tag && <> no tema {tag}</>}.{" "}
            <button type="button" onClick={() => (setQuery(""), setTag(""))}>
              Limpar filtro
            </button>
          </p>
        )}

        {filtered.lead && <Lead item={filtered.lead} activeTag={tag} onTag={toggleTag} />}

        {visibleSections.map(({ key, label, color, blurb }) => {
          const List = LISTS[key];
          return (
            <section key={key} id={`secao-${key}`} className={`section section-${key}`} style={{ "--accent": color }}>
              <header className="section-head">
                <h2>{label}</h2>
                <p>{blurb}</p>
              </header>
              <List items={filtered.sections[key]} activeTag={tag} onTag={toggleTag} />
            </section>
          );
        })}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <p>
            Edição gerada em {edition.dateLabel}
            {edition.stats.sources ? ` a partir de ${edition.stats.sources} fontes` : ""}. Uma nova edição sai todo dia às
            8h, horário de Brasília.
          </p>
          <p>
            Fontes incluem Techmeme, TechCrunch, The Verge, Ars Technica, Wired, MIT Technology Review, Crunchbase News,
            Neofeed, Brazil Journal, Stratechery, Hugging Face e GitHub.
          </p>
        </div>
      </footer>
    </>
  );
}
