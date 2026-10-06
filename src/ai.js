import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["intro", "highlights", "items"],
  properties: {
    intro: { type: "string", description: "Uma frase de abertura sobre o dia em tech." },
    highlights: {
      type: "array",
      description: "3 a 5 destaques do dia, cada um em uma frase curta.",
      items: { type: "string" }
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "why"],
        properties: {
          id: { type: "integer" },
          title: { type: "string", description: "Titulo traduzido para portugues, curto e claro." },
          why: { type: "string", description: "Uma frase: o que e e por que importa." }
        }
      }
    }
  }
};

/**
 * Writes a PT-BR editorial for the day (intro, highlights and per-item summaries).
 * Returns null when ANTHROPIC_API_KEY is not configured or the call fails, so the
 * newsletter still ships without AI.
 */
export async function generateEditorial(items) {
  if (!process.env.ANTHROPIC_API_KEY || items.length === 0) return null;

  const listing = items
    .map((item, id) => `[${id}] (${item.section}) ${item.title} — ${item.source}\n${item.summary}`)
    .join("\n\n");

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      system:
        "Voce e editor de uma newsletter diaria de tecnologia e startups para um leitor brasileiro. " +
        "Escreva em portugues do Brasil, direto e sem jargao desnecessario. Nao invente fatos alem do que esta nos itens.",
      messages: [
        {
          role: "user",
          content:
            `Estes sao os itens selecionados hoje (manchete, noticias, startups, Brasil, papers e analises):\n\n${listing}\n\n` +
            "Escreva a abertura, os destaques do dia e, para cada item (use o id), um titulo em portugues e uma frase dizendo por que importa."
        }
      ]
    });

    if (response.stop_reason === "refusal") {
      console.warn("[ai] request refused; shipping without editorial");
      return null;
    }
    const text = response.content.find((block) => block.type === "text")?.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.warn(`[ai] editorial skipped: ${error.message}`);
    return null;
  }
}
