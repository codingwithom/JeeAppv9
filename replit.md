# JEE Prep Workspace

A productivity and study dashboard for JEE exam preparation with a calendar, music player, PDF viewer, task management, and video tools.

## Run & Operate

- `pnpm install` — install all workspace dependencies
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

**Workflows (artifact-managed):**
- `artifacts/jee-prep: web` — React frontend (Vite, port 21847)
- `artifacts/api-server: API Server` — Express backend (port 8080)
- `artifacts/mockup-sandbox: Component Preview Server` — UI component sandbox

**Required env vars:** `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (auto-set by Replit DB)

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: v24
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, Radix UI, Framer Motion, TanStack Query, Wouter
- **Backend**: Express 5, Pino logging
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod (`zod/v4`), drizzle-zod
- **API codegen**: Orval (OpenAPI → React Query + Zod)
- **Build**: esbuild (API), Vite (frontend)

## Where things live

```
artifacts/
  jee-prep/        # React frontend app
  api-server/      # Express API server
  mockup-sandbox/  # UI component preview sandbox
lib/
  db/              # Drizzle ORM + PostgreSQL (schema at lib/db/src/schema/)
  api-spec/        # OpenAPI spec (openapi.yaml) + Orval config
  api-client-react/ # Generated React Query hooks
  api-zod/         # Generated Zod schemas
```

- DB schema: `lib/db/src/schema/`
- API spec: `lib/api-spec/openapi.yaml`
- Frontend routes: `artifacts/jee-prep/src/pages/`

## Architecture decisions

- Monorepo with pnpm workspaces; all internal packages use `workspace:*` refs
- API server is built with esbuild (ESM bundle) before running; `build.mjs` handles this
- Frontend proxies `/api` to the Express server at `localhost:8080` via Vite dev proxy
- **YouTube music**: Songs with `youtubeId` or `yt:{id}` URLs play via YouTube IFrame Player API (hidden player). Falls back to oEmbed for title/thumbnail when backend is unavailable. Old `/api/stream?url=` songs auto-detected and migrated to IFrame mode.
- **Shared YT loader**: `src/lib/youtube-api.ts` singleton ensures the IFrame API script loads once and chains `onYouTubeIframeAPIReady` callbacks from both MusicContext and VideoPage.
- **Backup/restore** (AdminPage): ZIP includes `idb/` folder with all IndexedDB binary files (PDFs, local music, video note images/voice/screenshots). Restore reconstructs Blobs with correct MIME types.
- `useLocalStorage` hook does NOT double-prefix: keys already starting with `jee_` are stored as-is. Auto-migrates legacy `jee_jee_*` keys on first load.
- Artifact system (`.replit-artifact/artifact.toml`) manages workflow ports and routing
- **Static build**: `Web/` folder at repo root = `artifacts/jee-prep/dist/` — upload to any static host. `base: "./"` in vite.config.ts ensures relative asset paths.

## Product

- **Dashboard**: Study overview with clock, streak cards, countdown timer, and time management
- **Calendar & Tags**: Weekly/monthly calendar with tagging system
- **Music Player**: YouTube track playback via IFrame API (no backend needed); local file upload; oEmbed title/thumbnail fetch fallback
- **PDF Viewer**: In-browser PDF reading with annotations stored in IndexedDB
- **Video Tools**: Video notes with voice recordings, screenshots, image blocks — all stored in IndexedDB
- **Task Management**: Todo system with drag-and-drop
- **Backup/Restore**: Full ZIP backup of localStorage + all IndexedDB binary files; selective per-category restore

## User preferences

_Populate as you build_

## Gotchas

- The API server requires `PORT` env var; set to `8080` in production artifact config
- `pnpm-workspace.yaml` enforces `minimumReleaseAge: 1440` (supply-chain protection) — do not disable
- esbuild is pinned to `0.27.3` via workspace overrides
- `play-dl` and `@distube/ytdl-core` are externalized from the esbuild bundle (native/complex deps)
- `yt-dlp` must be available as a system binary (installed via `replit.nix`)

## Pointers

- Package management: `.local/skills/package-management/SKILL.md`
- Database: `.local/skills/database/SKILL.md`
- Workflows: `.local/skills/workflows/SKILL.md`
