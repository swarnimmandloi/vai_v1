# VAI — Architecture Brief

Full design document. Read `CLAUDE.md` first for the quick session context.

---

## 1. What VAI is

VAI is a visual AI workspace. The user asks a question; instead of a wall of chat text, the AI generates a frame on an infinite canvas — a block-based visual answer (icon + text, images, graphs, mind-map, or a single line, depending on context). Frames are placed spatially and linked to each other. A lightweight chat panel on the right acts as a guide to what's on the canvas, not as the main answer surface. The goal long-term is a personalized "second brain" where the AI reasons over everything the user has built before.

---

## 2. The core architectural decision (file-as-database)

Every AI response and every user note is stored as a file. The AI reads and writes these files using tools — exactly like Claude Code does — except the "filesystem" is a database, not a disk.

**Mental model**: when the AI "creates a file," the backend runs an INSERT into the database. When it "edits a file," the backend runs an UPDATE. The AI doesn't know or care that there's no physical disk — it just calls `create_file`, `read_file`, `edit_file`, `list_files`.

### Why a database and not real local files

- **LLM dominates latency.** A model response takes seconds; a file read is milliseconds. Storage speed is invisible next to the model call — optimize for correctness and search, not raw read speed.
- **Search/filter is where real time goes.** A database with indexes beats walking a directory — and stays fast as files grow.
- **Cloud servers have ephemeral disks.** On serverless/container hosts, local disk is wiped on redeploy and isn't shared across instances. Local files would silently lose user data. The database is the durable layer.
- Note: even Claude Code uses its local filesystem as a scratchpad — its real persistence is the git push. Same principle: fast workspace on top, durable store underneath.

### No per-user sandbox / desktop

Claude Code's web version spins up an isolated container per session because it executes code (installs packages, runs bash). VAI only reads/writes/edits text files, which is not dangerous — no container, no sandbox, no per-user desktop is needed. Everything runs as plain database operations in one shared backend.

---

## 3. Storage model

**One shared database.** Every row is tagged with `user_id`. There are no separate databases per user — login just authenticates, then the backend queries `WHERE user_id = <id>`. (Same model OpenAI, Figma, Notion all use.)

### Hierarchy via a path string (not real folders)

Files are stored flat, and the folder structure is just text in a `path` column:

```
project1/canvas1/node_a.md
project1/canvas1/node_b.md
project1/canvas1/_map.json
project2/canvas1/node_a.md
userpreference.md
filesystem.md
```

Query "everything in project1" with a path-prefix match. No real directories needed.

### Tables (Supabase / Postgres)

```sql
users
  id, email, github_id, created_at

projects
  id, user_id, name, created_at

canvases
  id, project_id, name, created_at

files
  id, user_id, project_id, canvas_id,
  path, type, content,
  position_x, position_y,        -- where the frame sits on the canvas
  created_at, updated_at
  -- type: 'frame' | 'map' | 'preference' | 'index'

file_versions          -- history; snapshot a row before each edit
  id, file_id, content, created_at

connections            -- OR keep connections inside the map file
  id, canvas_id, from_file_id, to_file_id
```

---

## 4. The two special files

### `userpreference.md` — equivalent of `CLAUDE.md`

The AI reads this on every request to know how this specific user likes answers: depth, layout, mind-map vs. linear, tone, reading style. This file is the home of the "personalized to the human" thesis. **The LLM owns this file** and updates it over time as it learns the user, because keeping it current is a judgment call.

### `filesystem.md` — index/map of everything

Lists every project, canvas, and frame file with a one-line description. The AI reads this first to see what's available, then opens only the specific files it needs (cheap retrieval, no loading everything every time). **The backend owns this file** — auto-regenerate it deterministically whenever a file is created or edited (just "list rows + descriptions"). Do not make the LLM responsible for keeping it in sync; it will occasionally forget and the index will drift.

**Rule of thumb**: LLM owns judgment files (content, preferences). Backend owns bookkeeping files (the index, the map connections). This split prevents most "why is the map wrong" bugs.

---

## 5. What a frame file contains

Each frame file = one AI response, stored block-based (not one markdown blob). A frame holds multiple blocks; each block has an id and a type.

Block types:
- `icon_text` — Lucide icon + heading + body text
- `image` — image with caption
- `graph` / chart — data visualization (Recharts)
- `note` — user-written annotation, attached to another block
- `diagram` — Mermaid diagram (flowchart, sequence, class, state, ER)
- `stat` — single value + label + trend
- `list` — bulleted list with optional sub-items

Notes live inside the frame file. When the user adds a personal note to a block, that note is written back into the same frame file as a `note` block tied to the target block's id. Notes are not separate files — they travel with the frame they annotate.

Example frame file structure:
```json
{
  "frame_id": "...",
  "title": "...",
  "layout": "mindmap | linear | single",
  "blocks": [
    { "id": "b1", "type": "icon_text", "icon": "...", "text": "..." },
    { "id": "b2", "type": "graph", "data": {} },
    { "id": "b3", "type": "note", "attached_to": "b1", "text": "user's note" }
  ]
}
```

---

## 6. The map (canvas wiring)

Per canvas, one map file (`_map.json`). It lists which frames exist on that canvas, their positions, and which frames connect to which. The front-end canvas reads this to render the boxes and the lines between them. When the AI creates a new frame, the backend also updates the map to add the node and draw its connection to the parent frame.

---

## 7. The request loop

```
user asks something
  → API call to backend
  → backend calls the LLM, passing:
       - userpreference.md  (how this user likes answers)
       - filesystem.md      (what already exists)
       - the active thread's context (branching rules below)
  → LLM decides the answer shape + which tools to call
  → LLM calls create_file / edit_file / read_file / add_note
  → backend executes those as DB operations
  → backend deterministically updates filesystem.md + the map
  → canvas re-renders; chat panel shows the short guiding text
```

### Tools exposed to the LLM

```typescript
list_files(project_id)
  → paths + one-line descriptions (reads the index)

read_file(file_id | path)
  → file content

create_file(project_id, canvas_id, path, type, content, position)
  → INSERT into files table

edit_file(file_id, new_content)
  → UPDATE (+ snapshot to file_versions)

add_note(file_id, block_id, note_text)
  → append a note block into that frame file
```

The LLM produces two outputs per request:
1. A short guiding line for the chat panel
2. The frame written to the canvas via tools

---

## 8. Branching & context rules

- **No frame selected** when the user asks → create a new frame with full canvas context
- **A frame is selected** when the user asks → new frame branches off that one, with context of that thread only (previous context yes, sibling/later context no — like ChatGPT branching)
- User can manually connect / disconnect frames on the canvas
- Hovering a frame offers a quick "ask from here"

---

## 9. Current implementation vs. target

### What exists today

The app currently uses a **3-level in-memory node hierarchy** (ResponseNode → SectionNode → CardNode) with Dagre auto-layout. AI returns a structured JSON object; the frontend parses it and creates React Flow nodes. Everything is in Zustand (in-memory); Supabase code exists but is dormant.

### What changes with the file-based model

| Area | Current | Target |
|---|---|---|
| AI output | JSON response parsed client-side | AI calls `create_file` tool server-side |
| Storage | Zustand (in-memory) | `files` table in Supabase |
| Context | Canvas screenshot + thread history | `userpreference.md` + `filesystem.md` + thread |
| Persistence | None (demo mode) | Full — survives page refresh |
| Versioning | None | `file_versions` table |

### First concrete build step

Stand up the `files` table + the four tools (`create_file`, `read_file`, `edit_file`, `list_files`), then wire `create_file` to render a frame on the canvas.

---

## 10. V1 scope vs. parked

### Build now (V1)

- Left sidebar with project list
- First visit: single input box → transitions to full canvas after first question
- Right: lightweight chat panel as guide
- Center: infinite canvas (zoom, pan, free placement, drag, pinch-to-zoom on mobile)
- Block-based frames, spatially placed and visually linked
- AI responds two ways: guiding chat text + canvas frame
- Within a frame: click block → follow-up; add notes; remove/rearrange blocks; branch
- Branching + manual connect/disconnect (section 8)
- Projects as top container; multiple canvases per project; canvases in same project share knowledge context

### Parked (later)

- Journal & Tasks (global across projects)
- Multi-user collaboration on the same canvas
- Export / shareable links
- Canvas navigation agent ("take me to the market analysis")
- AI memory layer across sessions (deeper second brain)
- Canvas templates
- GitHub as file backend (gives version history; too much friction for first 10 users)
- Vector search (add when search becomes a real limitation)

---

## 11. On GitHub as a backend (considered, deferred)

Using GitHub as the file backend would give free version history and transparency — the model Claude Code uses. Skip it for the first 10 users: git is built for code, adds friction, and shoehorns canvas data awkwardly. Get the same "track every change" benefit with the `file_versions` table. Revisit if version control becomes a real user-facing feature.

---

## 12. Stack recommendation

- **Frontend**: Next.js + React Flow (canvas) — chat panel + infinite canvas
- **Backend**: Next.js API routes holding the tool implementations
- **DB / storage**: Supabase (Postgres) — files as rows; Supabase Storage later for images
- **Auth**: Supabase Auth (GitHub OAuth later if version control comes)
- **Model**: claude-sonnet-4-6 with extended thinking + tool use

Keep it boring and single-region for the first 10 users. Don't add caching, vector search, or GitHub until you feel an actual limitation.
