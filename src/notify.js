import nodemailer from "nodemailer";
import { config } from "./config.js";

const SECTION_LABELS = [
  ["news", "📰 Principais noticias"],
  ["startups", "🚀 Startups & venture"],
  ["papers", "📄 Papers em alta"]
];

const TELEGRAM_LIMIT = 4000;

function escapeHtml(value = "") {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function headline(item) {
  return item.titlePt || item.title;
}

function siteUrl() {
  return config.siteUrl;
}

// ---------- Telegram ----------

export function buildTelegramMessages(newsletter) {
  const blocks = [];
  let intro = `<b>☀️ ${escapeHtml(newsletter.title)} — ${escapeHtml(newsletter.dateLabel.split(" ")[0])}</b>\n\n${escapeHtml(newsletter.summary)}`;
  if (newsletter.highlights?.length) {
    intro += `\n\n${newsletter.highlights.map((line) => `• ${escapeHtml(line)}`).join("\n")}`;
  }
  blocks.push(intro);

  for (const [key, label] of SECTION_LABELS) {
    const items = newsletter.sections?.[key] || [];
    if (!items.length) continue;
    const lines = items.map(
      (item) => `• <a href="${escapeHtml(item.url)}">${escapeHtml(headline(item))}</a> <i>(${escapeHtml(item.source)})</i>`
    );
    blocks.push(`<b>${label}</b>\n${lines.join("\n")}`);
  }

  if (siteUrl()) blocks.push(`<a href="${escapeHtml(siteUrl())}">Abrir a edicao completa →</a>`);

  // Pack blocks into as few messages as possible without crossing Telegram's limit.
  const messages = [];
  let current = "";
  for (const block of blocks) {
    const next = current ? `${current}\n\n${block}` : block;
    if (next.length > TELEGRAM_LIMIT && current) {
      messages.push(current);
      current = block;
    } else {
      current = next;
    }
  }
  if (current) messages.push(current);
  return messages;
}

async function sendTelegram(newsletter) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  for (const text of buildTelegramMessages(newsletter)) {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } })
    });
    const body = await response.json().catch(() => ({}));
    if (!body.ok) throw new Error(`Telegram: ${body.description || response.status}`);
  }
}

// ---------- ntfy ----------

async function sendNtfy(newsletter) {
  const server = process.env.NTFY_SERVER || "https://ntfy.sh";
  const top = [...(newsletter.sections?.news || []).slice(0, 3), ...(newsletter.sections?.startups || []).slice(0, 2)];
  const message = [
    newsletter.highlights?.[0] || newsletter.summary,
    "",
    ...top.map((item) => `• ${headline(item)}`)
  ].join("\n");

  // JSON publishing keeps accents intact (HTTP headers would not).
  const response = await fetch(server, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: process.env.NTFY_TOPIC,
      title: `☀️ Tech Brief ${newsletter.dateLabel.split(" ")[0]}: ${newsletter.counts.total} destaques`,
      message,
      tags: ["newspaper"],
      ...(siteUrl() ? { click: siteUrl() } : {})
    })
  });
  if (!response.ok) throw new Error(`ntfy: HTTP ${response.status}`);
}

// ---------- E-mail ----------

export function buildEmailHtml(newsletter) {
  const sections = SECTION_LABELS.map(([key, label]) => {
    const items = newsletter.sections?.[key] || [];
    if (!items.length) return "";
    const rows = items
      .map(
        (item) => `
        <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb">
          <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">${escapeHtml(item.source)}</div>
          <a href="${escapeHtml(item.url)}" style="font-size:16px;font-weight:600;color:#0b4f6c;text-decoration:none">${escapeHtml(headline(item))}</a>
          ${item.titlePt ? `<div style="font-size:12px;color:#9ca3af">${escapeHtml(item.title)}</div>` : ""}
          <div style="font-size:14px;color:#374151;margin-top:4px">${escapeHtml(item.insight || "")}</div>
        </td></tr>`
      )
      .join("");
    return `<h2 style="font-size:18px;margin:28px 0 4px;color:#111827">${label}</h2><table width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
  }).join("");

  const highlights = newsletter.highlights?.length
    ? `<ul style="padding-left:18px;color:#111827">${newsletter.highlights.map((line) => `<li style="margin:4px 0">${escapeHtml(line)}</li>`).join("")}</ul>`
    : "";
  const link = siteUrl()
    ? `<p style="margin-top:28px"><a href="${escapeHtml(siteUrl())}" style="color:#0f766e">Abrir a edicao no site →</a></p>`
    : "";

  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:24px;background:#ffffff">
    <div style="font-size:12px;color:#0f766e;font-weight:700;letter-spacing:.08em">OPENCLAW</div>
    <h1 style="margin:4px 0 0;font-size:26px;color:#111827">Tech Brief</h1>
    <div style="color:#6b7280;font-size:13px">${escapeHtml(newsletter.dateLabel)}</div>
    <p style="font-size:15px;color:#111827;margin-top:16px">${escapeHtml(newsletter.summary)}</p>
    ${highlights}${sections}${link}
  </div></body></html>`;
}

async function sendEmail(newsletter) {
  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `OpenClaw Tech Brief <${process.env.SMTP_USER}>`,
    to: process.env.EMAIL_TO || process.env.SMTP_USER,
    subject: `☀️ Tech Brief ${newsletter.dateLabel.split(" ")[0]} — ${newsletter.highlights?.[0] || headline(newsletter.items[0] || { title: "seu resumo diario" })}`,
    html: buildEmailHtml(newsletter)
  });
}

// ---------- Dispatcher ----------

const channels = [
  { name: "telegram", enabled: () => process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID, send: sendTelegram },
  { name: "ntfy", enabled: () => process.env.NTFY_TOPIC, send: sendNtfy },
  { name: "email", enabled: () => process.env.SMTP_USER && process.env.SMTP_PASS, send: sendEmail }
];

/** Sends the newsletter to every configured channel. Returns per-channel results. */
export async function notifyAll(newsletter) {
  const active = channels.filter((channel) => channel.enabled());
  if (!active.length) {
    console.warn("[notify] nenhum canal configurado (TELEGRAM_*, NTFY_TOPIC ou SMTP_*). Veja o README.");
    return [];
  }

  const results = await Promise.allSettled(active.map((channel) => channel.send(newsletter)));
  return results.map((result, index) => {
    const name = active[index].name;
    if (result.status === "fulfilled") {
      console.log(`[notify] ${name}: enviado`);
      return { name, ok: true };
    }
    console.error(`[notify] ${name}: falhou — ${result.reason?.message || result.reason}`);
    return { name, ok: false };
  });
}
