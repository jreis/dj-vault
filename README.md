# Reis DJ Vault

**Curate DJ sets like a senior engineer ships systems** — vote, search, queue, and play YouTube tracks in a dark, keyboard-first music vault.

Portfolio project for [jasonreis.dev](https://jasonreis.dev). Personal story: lifelong DJ dream + 90s/00s rock, metal, grunge, and punk.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-5-443e38)

## Features

| Area | What you get |
|------|----------------|
| **Library** | 18 seed tracks (Metallica, Nirvana, RATM, Tool, …) |
| **Add tracks** | Title, artist, YouTube URL/ID, genre, year (era auto-fills) |
| **Voting** | Reddit-style up/down scores for set ranking |
| **Discovery** | Search + genre chips with counts + era + multi-column sort |
| **Playback** | YouTube embed + reorderable queue + continuous multi-track playlist |
| **Export** | Full library / playlist JSON, or copy a shareable URL |
| **Import** | JSON merge/replace; open a shared link and merge/replace |
| **Persistence** | Tracks, scores, queue, current track → `localStorage` |
| **UX** | Dark/light toggle, mobile card layout, keyboard-first nav |

## Quick start

```bash
git clone <your-repo-url> reis-dj-vault
cd reis-dj-vault
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build    # production → dist/
npm run preview  # serve dist locally
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
| `n` / `p` | Next / previous |
| `a` | Open add-track form |
| `?` | Shortcut help |
| `Esc` | Blur focused input |

## Architecture

```
src/
  components/   # Header, FilterBar, TrackTable, Player, AddTrackForm, Toolbar
  data/         # Seed track catalog
  hooks/        # Keyboard navigation
  lib/          # YouTube helpers, filter/sort, share-link encode/decode
  store/        # Zustand + persist (localStorage)
  types.ts      # Shared domain types
```

- **State:** one Zustand store with `persist` (`reis-dj-vault-v1`)
- **Media:** YouTube iframe only (no API key); queue IDs feed the embed `playlist` param for continuous play
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

## Deploy

Any static host works after `npm run build` (artifact: `dist/`).

**AWS Amplify / Netlify / Cloudflare Pages**

1. Connect the GitHub repo  
2. Build: `npm ci && npm run build`  
3. Output: `dist`  
4. Optional: map `dj.jasonreis.dev`

## Case study (portfolio)

- **Problem:** Rank tracks for DJ sets without a spreadsheet or SaaS lock-in.
- **Approach:** Local-first SPA; YouTube for media; pure filter/sort for snappy UX.
- **Trade-offs:** Single-user by design; embeds depend on YouTube availability; huge libraries may need JSON export instead of share URLs.
- **Senior touches:** Typed domain model, keyboard-first UX, shareable set links, accessible focus rings, mobile cards + desktop table.

## Roadmap

- [ ] Multi-device sync (Supabase / DynamoDB)
- [ ] Spotify / Apple Music export
- [ ] Local LLM “suggest similar tracks” (Ollama)
- [ ] Collaborative vaults

## License

MIT — use it, fork it, spin your own vault.

---

Built by **Jason Reis** · [jasonreis.dev](https://jasonreis.dev)
