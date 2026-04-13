# VAI — Visual AI Workspace
> Product Spec & Vision · Reference Document · April 2026

---

## What It Is

VAI is an AI workspace where answers become interactive visual maps on an infinite canvas — not chat messages. You ask something, the canvas builds out the thinking spatially. You branch, explore, go deeper.

Closest comparison: NotebookLM meets Miro, but AI-native from the ground up. Not another chat UI.

---

## The Magic Moment

User types a question. Instead of a wall of text, the canvas generates a structured visual frame — blocks with icons, text, charts — placed spatially. User clicks a block. It expands deeper. The canvas becomes a living map of their thinking.

---

## Long-Term Vision

Retrain AI on how humans think visually — using mind maps and canvas interactions, not just chat responses. End state: replace web browsing entirely. Instead of Google returning websites, VAI generates the entire answer as a rich, interactive, personalized page on the canvas. No redirects. No websites. Personalized to the human.

---

## V1 Feature List

### Core Layout
- Left sidebar: project list (always visible)
- On first visit: simple single input window — just ask a question, nothing else
- After first question: transitions to full canvas view
- Right side: chat panel — lightweight, acts as a guide to what's on canvas (not a heavy response panel)
- Center: infinite canvas — zoom, pan, free placement

### The Canvas & Frames
- Every AI response = one **frame** on the canvas
- Frames are block-based — NOT markdown, NOT a single text blob
- Block types: icon + text, images, graphs/charts, lists, stat callouts
- Frames placed spatially on canvas — not in a list, not in a thread
- Frames visually linked/connected when part of the same thread

### AI Response Behavior
- AI responds in two ways simultaneously:
  1. Chat panel: short guiding text (2-3 sentences) — helps navigate canvas
  2. Canvas: structured frame with visual blocks
- Response format is not fixed — mind-map style, linear blocks, single visual — AI decides
- NOT constrained to markdown

### Frame Interactions
- Click any block → ask follow-up → response expands within that same frame
- Add personal notes to any block
- Remove or rearrange blocks within a frame
- Click whole frame → option to expand, branch, or ask new question
- Hover over frame → quick question option

### Branching & Context
- No frame selected + question → new frame, AI has full canvas context
- Frame selected + question → new frame branches from that one, AI has context of that thread only
- Manually connect or disconnect frames on the canvas

### Project Structure
- Projects as top-level containers
- Multiple canvases per project
- Canvases in same project share knowledge context

---

## Parked for Later (Not V1)
- Journal and Tasks (global across projects)
- Multi-user collaboration
- Export / shareable links
- Canvas navigation agent
- AI memory layer across sessions
- Templates
- Code execution inside nodes
- Live website preview in canvas
