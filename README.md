# OpenClaw Tech Brief

Newsletter diaria com as principais noticias de tecnologia, startups e papers. Todo dia as 08:00 (horario de Brasilia) um GitHub Action gera a edicao, publica no GitHub Pages e manda uma notificacao para voce (Telegram, push no celular via ntfy e/ou e-mail).

## O que entra em cada edicao

| Secao | Fontes |
| --- | --- |
| Manchete + Tech (11) | Techmeme, MIT Technology Review, The Verge, TechCrunch, Ars Technica, Wired, IEEE Spectrum, Rest of World, 404 Media, Hacker News, OpenAI, Google DeepMind, Hugging Face |
| Startups (8) | TechCrunch Startups/Venture, Crunchbase News, Sifted, Y Combinator, Product Hunt, rodadas no Google News |
| Brasil (6) | Neofeed, Brazil Journal, Startups.com.br, Tecnoblog, Canaltech, rodadas no Google News BR |
| Papers (6) | Hugging Face Daily Papers (upvotes da comunidade), com arXiv como reserva |
| Repos (6) | Repositorios criados nesta semana com mais estrelas no GitHub |
| Leituras (5) | Stratechery, Benedict Evans, Pragmatic Engineer, Simon Willison, Platformer, Import AI, One Useful Thing, Interconnects, Latent Space, Not Boring |

O ranking combina peso da fonte, recencia, temas, pontos no Hacker News, upvotes dos papers e estrelas no GitHub. Ele filtra ruido (dicas de acoes, promocoes, tutoriais), junta a mesma noticia vinda de fontes diferentes e evita que um assunto ou uma fonte domine a edicao. Cada item recebe tags (IA, Chips, Seguranca, Rodada, M&A...) e as rodadas tem o valor captado extraido do texto.

Com `ANTHROPIC_API_KEY` configurada, o Claude escreve a abertura do dia, 3 a 5 destaques e traduz cada titulo para portugues com uma frase de "por que importa". Sem a chave a newsletter funciona normalmente, com os titulos originais.

## Site

O site e um app React (Vite) em `web/`, com componentes do [React Bits](https://reactbits.dev): LightRays no topo, BlurText na data, CountUp nos numeros do dia e SpotlightCard nos papers. Tem busca, filtro por tema, tema escuro automatico e arquivo de edicoes anteriores (`?edicao=AAAA-MM-DD`).

## Configurar as notificacoes (escolha um ou mais canais)

Cadastre os valores em **Settings → Secrets and variables → Actions → New repository secret** no GitHub.

### Telegram (recomendado)
1. No Telegram, fale com o [@BotFather](https://t.me/BotFather), envie `/newbot` e copie o token.
2. Mande qualquer mensagem para o seu bot novo.
3. Fale com o [@userinfobot](https://t.me/userinfobot) para descobrir o seu chat id.
4. Secrets: `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`.

### ntfy (push no celular, sem cadastro)
1. Instale o app **ntfy** (iOS/Android) e assine um topico com nome dificil de adivinhar, ex.: `techbrief-gui-8f3k2`.
2. Secret: `NTFY_TOPIC` com esse nome.

> Os topicos do ntfy.sh sao publicos para quem souber o nome, por isso use um nome aleatorio.

### E-mail (Gmail)
1. Ative a verificacao em duas etapas e crie uma [senha de app](https://myaccount.google.com/apppasswords).
2. Secrets: `SMTP_USER` (seu Gmail), `SMTP_PASS` (a senha de app) e, se quiser, `EMAIL_TO`.
   Para outro provedor, adicione tambem `SMTP_HOST` e `SMTP_PORT`.

### Resumo com IA (opcional)
Secret: `ANTHROPIC_API_KEY`.

## Publicacao e agendamento

1. **Settings → Pages → Source: GitHub Actions.**
2. O workflow `.github/workflows/pages.yml` roda todo dia as 11:00 UTC (08:00 em Sao Paulo):
   gera a edicao → publica no Pages → envia as notificacoes → arquiva `data/AAAA-MM-DD.json` no repositorio.
3. Para testar na hora: **Actions → Daily tech brief → Run workflow**.

Pushes na `main` so republicam o site e nao notificam.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha os canais que quiser
npm run generate       # gera data/latest.json e data/AAAA-MM-DD.json
npm run dev            # site em modo dev (Vite), lendo as edicoes de data/
npm run build          # gera a edicao do dia + site estatico em dist/
npm run build:site     # so recompila o site com as edicoes existentes
npm run notify         # envia a ultima edicao para os canais configurados
npm run daily          # gera e envia
npm start              # serve dist/ em http://localhost:4321 + agendamento diario local
```

## Estrutura

- `src/sources.js`: feeds, pesos de fontes e temas (edite aqui para mudar o foco)
- `src/newsletter.js`: coleta, ranking, deduplicacao e montagem das secoes
- `src/ai.js`: resumo editorial opcional com Claude
- `src/notify.js`: envio para Telegram, ntfy e e-mail
- `src/build-static.js`: gera a edicao, compila o site e monta o arquivo de edicoes
- `web/`: site em React (`web/src/components/reactbits/` tem os componentes do React Bits)
