# DJ Vault

**Curate DJ sets like a senior engineer ships systems** — vote, search, queue, and play YouTube tracks in a dark, keyboard-first music vault.

Live: **[jasonreis.dev](https://jasonreis.dev)** · App: **[jasonreis.dev/djvault](https://jasonreis.dev/djvault)**  
Portfolio + DJ Vault by [Jason Reis](https://jasonreis.dev).

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-5-443e38)

## Features

| Area | What you get |
|------|----------------|
| **Library** | 21 seed tracks (Metallica, Nirvana, Elvis, Ghost, RATM, Tool, …) |
| **Add tracks** | Title, artist, YouTube URL/ID, genre, year (era auto-fills) |
| **Voting** | Reddit-style up/down scores for set ranking |
| **Discovery** | Search + genre chips + **similar tracks** (genre/era/notes) |
| **Similar** | In-vault recommendations from any track; YouTube “find more” links |
| **Playback** | YouTube embed + reorderable queue + continuous multi-track playlist |
| **Export** | Full library / playlist JSON, or copy a shareable URL |
| **Import** | JSON merge/replace; open a shared link and merge/replace |
| **Persistence** | Tracks, scores, queue, current track → `localStorage` |
| **UX** | Dark/light toggle, mobile card layout, keyboard-first nav |

## Quick start

```bash
git clone <your-repo-url> dj-vault
cd dj-vault
npm install
npm run dev
```

Open the URL Vite prints. With the production base path, local dev is usually:

`http://localhost:5173/djvault/`

```bash
npm run build    # production → dist/ (assets under /djvault/)
npm run preview  # serve dist locally at /djvault/
npm run lint     # oxlint
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `j` / `k` or `↓` / `↑` | Move selection |
| `Enter` | Play selected |
| `u` / `d` | Upvote / downvote |
| `q` | Add selected to queue |
| `s` | Find similar tracks (selected or now playing) |
| `n` / `p` | Next / previous |
| `a` | Open add-track form |
| `?` | Shortcut help |
| `Esc` | Close similar panel / blur inputs |

## Architecture

```
src/
  components/   # Header, FilterBar, TrackTable, Player, AddTrackForm, Toolbar, SimilarTracks
  data/         # Seed track catalog
  hooks/        # Keyboard navigation
  lib/          # YouTube helpers, filter/sort, share-link, similarity
  store/        # Zustand + persist (localStorage)
  types.ts      # Shared domain types
```

- **State:** one Zustand store with `persist` (`dj-vault-v1`)
- **Base path:** Vite `base: '/djvault/'` for `https://jasonreis.dev/djvault`
- **Media:** YouTube iframe only (no API key); queue IDs feed the embed `playlist` param
- **Sharing:** compact Base64URL payload in the URL hash (`#share=…`)

### Data model

```ts
interface Track {
  id: string
  title: string
  artist: string
  youtubeId: string
  genre: Genre
  era: Era
  year: number
  score: number
  notes: string
  addedAt: string  // ISO
}
```

## Deploy — Cloudflare Pages (recommended)

The production build is assembled for **Cloudflare Pages**:

```
dist/
  index.html          → portfolio landing (landing/)
  styles.css
  favicon.svg
  _redirects          → SPA fallback for /djvault/*
  djvault/
    index.html
    assets/
    …
```

Edit the home page in `landing/`. Rebuild ships it to `/`.
### 1. Push the repo to GitHub

```bash
# if you haven’t yet
git remote add origin git@github.com:<you>/dj-vault.git
git push -u origin main
```

### 2. Create a Pages project

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select the `dj-vault` repo
3. Build settings:

| Setting | Value |
|---------|--------|
| Framework preset | Vite (or None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (repo root) |
| Node version | `22` (or `20`) — set under **Environment variables** → `NODE_VERSION=22` if needed |

4. **Save and Deploy**

You’ll get a URL like `https://dj-vault-xxxx.pages.dev` — open **`…pages.dev/djvault/`**.

### 3. Attach jasonreis.dev

1. Add the domain in Cloudflare (if it isn’t already): **Websites** → **Add a site** → `jasonreis.dev`  
   Point Namecheap nameservers to the ones Cloudflare shows.
2. Pages project → **Custom domains** → **Set up a custom domain** → `jasonreis.dev` (and optionally `www`)
3. After DNS is active:
   - **https://jasonreis.dev/** → redirects into the app  
   - **https://jasonreis.dev/djvault/** → DJ Vault  

When you later ship a full portfolio at `/`, remove the root redirect in `scripts/cf-pages.mjs` (and root `dist/index.html`) and serve the portfolio from another Pages project or the same repo.

### 4. Local check of the Pages layout

```bash
npm run build
npx serve dist   # open http://localhost:3000/djvault/
```

### SPA note

`dist/_redirects` includes:

```
/djvault/*  /djvault/index.html  200
```

Cloudflare still serves real files under `/djvault/assets/` first; the rule only covers client routes.

## Case study (portfolio)

- **Problem:** Rank tracks for DJ sets without a spreadsheet or SaaS lock-in.
- **Approach:** Local-first SPA; YouTube for media; pure filter/sort for snappy UX.
- **Trade-offs:** Single-user by design; embeds depend on YouTube availability; huge libraries may need JSON export instead of share URLs.
- **Senior touches:** Typed domain model, keyboard-first UX, shareable set links, accessible focus rings, mobile cards + desktop table, subdirectory-ready deploy.

## Roadmap

- [ ] Multi-device sync (Supabase / DynamoDB)
- [ ] Spotify / Apple Music export
- [ ] Local LLM “suggest similar tracks” (Ollama)
- [ ] Collaborative vaults

## License

MIT — use it, fork it, spin your own vault.

---

Built by **Jason Reis** · [jasonreis.dev](https://jasonreis.dev)
