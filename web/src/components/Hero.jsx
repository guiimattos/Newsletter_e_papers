import LightRays from "./reactbits/LightRays.jsx";
import BlurText from "./reactbits/BlurText.jsx";
import CountUp from "./reactbits/CountUp.jsx";
import { formatDay } from "../lib/edition.js";

const reducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Hero({ edition, archive, onPickEdition, isLatest }) {
  const day = formatDay(edition.date);
  const { stats } = edition;
  const figures = [
    [stats.news, "notícias de tech"],
    [stats.startups + (stats.brasil || 0), "de startups e Brasil"],
    [stats.papers, "papers em alta"],
    [stats.sources, "fontes lidas hoje"]
  ].filter(([value]) => value);

  return (
    <header className="hero">
      <div className="hero-rays" aria-hidden="true">
        <LightRays
          raysOrigin="top-center"
          raysColor="#FFC89A"
          raysSpeed={reducedMotion ? 0 : 0.6}
          lightSpread={0.9}
          rayLength={1.6}
          fadeDistance={1.1}
          followMouse={!reducedMotion}
          mouseInfluence={0.06}
          noiseAmount={0.06}
        />
      </div>

      <div className="hero-inner">
        <div className="hero-top">
          <span className="brand">
            <span className="brand-sun" aria-hidden="true" />
            OpenClaw Tech Brief
          </span>
          {archive.length > 1 && (
            <label className="edition-picker">
              <span className="visually-hidden">Escolher edição</span>
              <select value={isLatest ? "" : edition.date} onChange={(event) => onPickEdition(event.target.value)}>
                <option value="">Edição de hoje</option>
                {archive.map(({ date }) => (
                  <option key={date} value={date}>
                    {formatDay(date).short}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <p className="hero-weekday">{day.weekday}</p>
        <h1 className="hero-date">
          <BlurText key={edition.date} text={day.long} animateBy="words" delay={140} direction="bottom" />
        </h1>

        <p className="hero-intro">{edition.summary}</p>

        {edition.highlights.length > 0 && (
          <ul className="hero-highlights">
            {edition.highlights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        <dl className="hero-figures">
          {figures.map(([value, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <CountUp to={value} duration={1.2} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
