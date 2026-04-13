# VAI — Visual AI Workspace

An AI workspace where answers become interactive visual maps on an infinite canvas — not chat messages.

## Getting Started

### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
3. Enable **Magic Link** auth in Authentication → Providers

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Run the dev server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js 16** (App Router) + TypeScript
- **@xyflow/react** — infinite canvas
- **Zustand** — state management
- **Supabase** — database + auth
- **Anthropic claude-sonnet-4-6** — AI responses via structured JSON
- **Recharts** — charts inside canvas frames
- **Framer Motion** — transitions
- **Tailwind CSS v4**

## Project Structure

```
src/
├── app/                    # Next.js routes + API
├── components/
│   ├── canvas/             # CanvasView, FrameNode, block types
│   ├── chat/               # ChatPanel, ChatInput, ChatMessage
│   ├── first-visit/        # Onboarding overlay
│   └── layout/             # AppShell, Sidebar
├── hooks/                  # useAIResponse, useCanvasContext
├── lib/ai/                 # Prompts, Zod schema, Supabase clients
├── store/                  # Zustand stores (canvas, chat, UI, project)
└── types/                  # TypeScript types
```

## Deploying

Deploy to [Vercel](https://vercel.com) — zero config with Next.js. Add your three env vars in the Vercel dashboard.
