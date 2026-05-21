# OpenClaw Tech Brief

Aplicacao para gerar uma newsletter diaria com noticias globais de tecnologia e papers recentes. Ela roda localmente com Express e tambem gera uma versao estatica em `dist/` para GitHub Pages.

## O que entra no briefing

- Noticias de fontes como MIT Technology Review, The Verge, TechCrunch, Ars Technica, Wired, IEEE Spectrum e Google News.
- Papers recentes do arXiv em IA, machine learning, seguranca e robotica.
- Ranking por fonte, recencia, tema e sinais de impacto.
- Separacao visual entre noticias e papers.

## Rodar

```bash
npm install
npm start
```

Abra:

```text
http://localhost:4321
```

## Gerar manualmente

```bash
npm run generate
```

## Gerar site estatico

```bash
npm run build
```

O resultado fica em:

```text
dist/
```

Essa pasta e o artefato que o GitHub Pages publica.

## Configuracao

Copie `.env.example` para `.env` se quiser ajustar:

- `PORT`: porta do painel web.
- `NEWSLETTER_TIME`: horario diario, formato `HH:mm`.
- `NEWSLETTER_TIMEZONE`: timezone do agendamento.
- `NEWSLETTER_MAX_ITEMS`: quantidade maxima de noticias no briefing.

O agendamento diario roda enquanto o servidor estiver aberto.

## Subir para seu GitHub

Crie um repositorio vazio no GitHub, entre nesta pasta e rode:

```bash
git init
git add .
git commit -m "Create daily tech brief"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/tech-newsletter.git
git push -u origin main
```

Depois, no GitHub:

1. Abra `Settings > Pages`.
2. Em `Build and deployment`, selecione `GitHub Actions`.
3. Rode o workflow `Build and publish daily tech brief` manualmente ou espere o agendamento diario.

O workflow em `.github/workflows/pages.yml` gera uma nova edicao todos os dias as 08:00 no horario de Sao Paulo, via cron `11:00 UTC`, e publica no GitHub Pages.

## Parar servidor em background

Se o app foi iniciado em background:

```bash
kill $(cat data/server.pid)
```
