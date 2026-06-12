@AGENTS.md

# VAI — Claude Code Context

## What this is

VAI is a visual AI workspace. The user asks a question; instead of chat text, the AI generates a structured response rendered as interconnected cards on an infinite canvas. A lightweight chat panel acts as a guide, not the main answer surface. Long-term goal: a personalized second brain where the AI reasons over everything the user has built.

## Current state (as of June 2026)

- App runs in **demo mode** — fully in-memory (Zustand), no persistence across page refreshes
- Supabase is being **reconnected** — tables exist in code but dormant; `NEXT_PUBLIC_SUPABASE_URL` check gates all DB writes
- Mobile layout was just added — canvas overlays full-screen on mobile, chat is primary surface
- Root (`/`) redirects to `/demo`; workspace route (`/[projectId]/canvas/[canvasId]`) is for the authenticated, persisted version

## Stack

- **Next.js** (App Router) + **React** 19 + **TypeScript**
- **@xyflow/react** — infinite canvas, node/edge rendering
- **@dagrejs/dagre** — auto-layout engine
- **Zustand** + **Immer** — state (3 stores: canvasStore, chatStore, uiStore)
- **Anthropic SDK** — claude-sonnet-4-6, extended thinking (8k budget)
- **Supabase** — Postgres + Auth (being reconnected)
- **Mermaid** — diagram blocks; **Recharts** — chart blocks; **html-to-image** — canvas snapshots

## 3-level node hierarchy

```
ResponseNode  (container — topic + follow-up input)
  └── SectionNode  (colored group — blue/green/purple/orange/teal/red)
        └── CardNode  (atomic unit — image + heading + markdown body)
```

Cards have `extent: 'parent'` — can't drag outside their parent. Layout: Dagre, 3-pass (cards within sections → ungrouped cards → sections within response). Desktop = LR, mobile = TB.

## Key files

| File | Role |
|---|---|
| `src/app/api/ai/respond/route.ts` | AI endpoint — calls Claude, parses JSON, normalizes |
| `src/hooks/useAIResponse.ts` | Submit logic — builds message, calls API, runs layout, updates store |
| `src/lib/canvas/layoutHierarchy.ts` | Dagre 3-pass layout — cards → sections → response |
| `src/lib/ai/prompts.ts` | System prompt + user message builder |
| `src/lib/ai/schema.ts` | Zod schemas for AI response validation |
| `src/store/canvasStore.ts` | Nodes, edges, React Flow handlers, addResponseGraph |
| `src/components/canvas/CanvasView.tsx` | React Flow wrapper + post-render re-layout |
| `src/components/canvas/nodes/` | ResponseNode, SectionNode, CardNode, FrameNode |

## What's changing next

The backend is moving to a **file-as-database model**. Every AI response becomes a file row in Supabase. The AI will interact with files via tools (`create_file`, `read_file`, `edit_file`, `list_files`) — it doesn't know or care that the "filesystem" is a database. Two special files gate every request: `userpreference.md` (how this user likes answers — AI-owned) and `filesystem.md` (index of everything — backend-owned, auto-regenerated).

See `ARCHITECTURE.md` for the complete design brief and future data model.

## Patterns to know

- **Post-render re-layout**: initial layout uses estimated card heights; after React Flow measures real DOM heights, layout re-runs. `relaidOutRef` (a Set) prevents infinite loops.
- **Canvas snapshot**: canvas is captured as base64 JPEG and sent to Claude for visual context on each request.
- **Thread context**: drilling into a card sends an ancestry breadcrumb chain so Claude branches intelligently.
- **Custom events**: `vai:focus-frame` and `vai:follow-up` cross-component signals via `window.dispatchEvent`.
- **Demo mode guard**: `canvasId === 'demo' || !process.env.NEXT_PUBLIC_SUPABASE_URL` skips all DB writes.
