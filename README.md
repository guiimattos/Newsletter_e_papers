# OpenClaw Tech Brief

Newsletter diaria com as principais noticias de tecnologia, startups e papers. Todo dia as 08:00 (horario de Brasilia) um GitHub Action gera a edicao, publica no GitHub Pages e manda uma notificacao para voce (Telegram, push no celular via ntfy e/ou e-mail).

## O que entra em cada edicao

| Secao | Fontes |
| --- | --- |
| Principais noticias (8) | MIT Technology Review, The Verge, TechCrunch, Ars Technica, Wired, IEEE Spectrum, Hacker News (front page) e Google News |
| Startups & venture (6) | TechCrunch Startups/Venture, Startups.com.br, Product Hunt, Google News (rodadas no mundo e no Brasil) |
| Papers em alta (5) | Hugging Face Daily Papers (ranqueados por upvotes da comunidade), com arXiv como reserva |

O ranking combina peso da fonte, recencia, temas (IA, chips, seguranca, rodadas, IPOs...), pontos no Hacker News e upvotes dos papers. Ele filtra ruido (ETFs, dicas de acoes, promocoes), remove duplicadas e limita repeticoes da mesma fonte ou do mesmo assunto.

Com `ANTHROPIC_API_KEY` configurada, o Claude escreve a abertura do dia, de 3 a 5 destaques e traduz cada titulo para portugues com uma frase de "por que importa". Sem a chave, a newsletter funciona normalmente com os titulos originais.

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
npm run generate       # gera data/latest.json
npm run notify         # envia a ultima edicao para os canais configurados
npm run daily          # gera e envia
npm start              # dashboard em http://localhost:4321 + agendamento diario local
npm run build          # gera o site estatico em dist/
```

## Estrutura

- `src/sources.js`: feeds, pesos de fontes e temas (edite aqui para mudar o foco)
- `src/newsletter.js`: coleta, ranking, deduplicacao e montagem das secoes
- `src/ai.js`: resumo editorial opcional com Claude
- `src/notify.js`: envio para Telegram, ntfy e e-mail
- `public/`: dashboard web
