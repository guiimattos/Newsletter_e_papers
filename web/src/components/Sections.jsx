import { useState } from "react";
import SpotlightCard from "./reactbits/SpotlightCard.jsx";
import { formatFunding, formatRound, hostOf, timeAgo } from "../lib/edition.js";

function Thumb({ src, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      className={`thumb ${className}`}
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function Tags({ tags, activeTag, onTag }) {
  if (!tags?.length) return null;
  return (
    <ul className="tags">
      {tags.map((tag) => (
        <li key={tag}>
          <button type="button" className={tag === activeTag ? "is-active" : ""} onClick={() => onTag(tag)}>
            {tag}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Meta({ item }) {
  return (
    <p className="meta">
      <span className="meta-source">{item.source}</span>
      <time dateTime={item.publishedAt}>{timeAgo(item.publishedAt)}</time>
    </p>
  );
}

function Title({ item, as: Tag = "h3", className = "" }) {
  return (
    <Tag className={`item-title ${className}`}>
      <a href={item.url} target="_blank" rel="noreferrer">
        {item.titlePt || item.title}
      </a>
    </Tag>
  );
}

// Shows the original headline when the title was translated.
function Original({ item }) {
  return item.titlePt ? <p className="original">{item.title}</p> : null;
}

export function Lead({ item, activeTag, onTag }) {
  return (
    <article className={`lead ${item.image ? "has-image" : ""}`}>
      {item.image && (
        <a className="lead-media" href={item.url} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
          <Thumb src={item.image} />
        </a>
      )}
      <div className="lead-body">
        <p className="lead-kicker">Manchete do dia</p>
        <Title item={item} as="h2" className="lead-title" />
        <Original item={item} />
        {item.summary && <p className="lead-summary">{item.summary}</p>}
        {item.insight && <p className="insight">{item.insight}</p>}
        <div className="lead-foot">
          <Meta item={item} />
          <Tags tags={item.tags} activeTag={activeTag} onTag={onTag} />
        </div>
      </div>
    </article>
  );
}

export function NewsList({ items, activeTag, onTag }) {
  return (
    <ol className="ranked">
      {items.map((item) => (
        <li key={item.id || item.url} className="ranked-item">
          <div className="ranked-body">
            <Title item={item} />
            <Original item={item} />
            {item.summary && <p className="summary">{item.summary}</p>}
            {item.insight && <p className="insight">{item.insight}</p>}
            <div className="row-foot">
              <Meta item={item} />
              <Tags tags={item.tags} activeTag={activeTag} onTag={onTag} />
            </div>
          </div>
          <Thumb src={item.image} className="ranked-thumb" />
        </li>
      ))}
    </ol>
  );
}

export function StartupList({ items, activeTag, onTag }) {
  return (
    <ul className="deals">
      {items.map((item) => (
        <li key={item.id || item.url} className={`deal ${item.funding ? "has-amount" : ""}`}>
          {item.funding && (
            <p className="deal-amount">
              <strong>{formatFunding(item.funding)}</strong>
              {item.funding.round && <span>{formatRound(item.funding.round)}</span>}
            </p>
          )}
          <div className="deal-body">
            <Title item={item} />
            <Original item={item} />
            {item.summary && <p className="summary">{item.summary}</p>}
            <div className="row-foot">
              <Meta item={item} />
              <Tags tags={item.tags} activeTag={activeTag} onTag={onTag} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BrasilList({ items, activeTag, onTag }) {
  return (
    <ul className="brasil">
      {items.map((item) => (
        <li key={item.id || item.url} className="brasil-item">
          <Thumb src={item.image} className="brasil-thumb" />
          <div>
            {item.funding && <p className="chip-amount">{formatFunding(item.funding)}</p>}
            <Title item={item} />
            {item.summary && <p className="summary">{item.summary}</p>}
            <div className="row-foot">
              <Meta item={item} />
              <Tags tags={item.tags} activeTag={activeTag} onTag={onTag} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PaperGrid({ items }) {
  return (
    <ul className="papers">
      {items.map((item) => (
        <li key={item.id || item.url}>
          <SpotlightCard className="paper" spotlightColor="rgba(118, 83, 232, 0.16)">
            <Thumb src={item.image} className="paper-thumb" />
            <Title item={item} />
            <Original item={item} />
            {(item.organization || item.authors?.length > 0) && (
              <p className="paper-authors">{item.organization || item.authors.join(", ")}</p>
            )}
            {item.summary && <p className="summary">{item.summary}</p>}
            <p className="paper-foot">
              {item.upvotes > 0 && (
                <span className="upvotes" title="Upvotes no Hugging Face">
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M6 2 11 9H1z" fill="currentColor" />
                  </svg>
                  {item.upvotes}
                </span>
              )}
              {item.github && (
                <a href={item.github} target="_blank" rel="noreferrer">
                  Ver código
                </a>
              )}
            </p>
          </SpotlightCard>
        </li>
      ))}
    </ul>
  );
}

export function RepoGrid({ items }) {
  return (
    <ul className="repos">
      {items.map((item) => {
        const [owner, name] = item.title.split("/");
        return (
          <li key={item.id || item.url} className="repo">
            <a href={item.url} target="_blank" rel="noreferrer" className="repo-link">
              {item.image && <img className="repo-avatar" src={item.image} alt="" loading="lazy" />}
              <span className="repo-name">
                <span>{owner}/</span>
                {name}
              </span>
            </a>
            <p className="summary">{item.summary}</p>
            <p className="repo-foot">
              <span className="stars" title="Estrelas no GitHub">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M8 .9l2.2 4.6 5 .7-3.6 3.5.9 5L8 12.3l-4.5 2.4.9-5L.8 6.2l5-.7z"
                    fill="currentColor"
                  />
                </svg>
                {item.stars?.toLocaleString("pt-BR")}
              </span>
              {item.language && <span>{item.language}</span>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function ReadsList({ items }) {
  return (
    <ul className="reads">
      {items.map((item) => (
        <li key={item.id || item.url} className="read">
          <p className="read-source">{item.source}</p>
          <div>
            <Title item={item} />
            <Original item={item} />
            {item.summary && <p className="read-summary">{item.summary}</p>}
            <p className="meta">
              <time dateTime={item.publishedAt}>{timeAgo(item.publishedAt)}</time>
              {item.readingMinutes > 0 && <span>{item.readingMinutes} min de leitura</span>}
              <span>{hostOf(item.url)}</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
