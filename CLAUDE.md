@AGENTS.md

# Project: Twin Celeb

Celebrity look-alike finder using Claude Vision API. User uploads a photo → Claude analyzes mood/vibe/impression → returns 3 celebrity matches (min 1 Korean + 1 Hollywood).

## Tech Stack

- **Next.js 16** (App Router) + **React 19** — read `node_modules/next/dist/docs/` before touching routing or server components
- **Tailwind CSS v4** — uses `@import "tailwindcss"` syntax, NOT `@tailwind base/components/utilities`
- **@anthropic-ai/sdk ^0.80** — Claude Sonnet 4.6 for vision analysis
- **pnpm 10** — always use `pnpm`, never `npm` or `yarn`
- **TypeScript strict mode**

## Architecture

```
app/page.tsx              # Main state machine (upload → loading → result)
app/api/find-celeb/route.ts  # POST: receives image, calls Claude, returns celebrities[]
components/ImageUpload.tsx   # Drag-drop (desktop) / file picker (mobile) + client-side compression
components/CelebResult.tsx   # Result display + share (Web Share API / PNG download)
lib/claude.ts                # Anthropic SDK wrapper, prompt lives here
types/index.ts               # Celebrity, FindCelebResponse interfaces
```

## Key Conventions

- **Commits**: conventional format — `feat:`, `fix:`, `docs:`, `refactor:`, etc. (max 100 chars)
- **Image limit**: 5MB max; client compresses via Canvas API (max 2048px) before upload
- **Matching logic**: Claude matches on mood/vibe/impression, NOT physical features — do not change this intent when editing prompts
- **Similarity range**: 50–95% (enforced in prompt)
- **Response format**: always `{ celebrities: Celebrity[] }` JSON — any change breaks the client parser

## Environment

```
ANTHROPIC_API_KEY=sk-ant-...   # required in .env.local
```

## Commands

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm type-check   # tsc --noEmit
pnpm release      # patch release via release-it
```
