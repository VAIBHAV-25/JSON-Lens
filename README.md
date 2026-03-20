# JSON Lab

A fast, beautiful, browser-based JSON toolkit built with React 18, TypeScript, and Vite. Zero backend, zero signup — paste your JSON and go.

---

## Features

### 🔍 Viewer
- Paste JSON, upload a `.json` file, drag & drop, or fetch from a URL
- Interactive collapsible tree with syntax-colored values
- Full-text search across keys and values with match count
- Expand / collapse all, copy any path to clipboard
- **Format** (pretty-print), **Minify**, **Copy**, **Save** (download), and **Clear** quick actions
- Live validation badge + file size indicator (B / KB / MB)

### 🕸️ Graph
- Pan & zoom SVG node-graph of the full JSON structure
- **Zoom-to-cursor** (scroll wheel) — canvas never jumps
- Smart initial view: shows first 3 depth levels at a comfortable scale; auto-fits small graphs
- Rectangular nodes with per-type gradient fills, 5 px accent bars, and value previews
- Animated node entrance (staggered slide-in) and edge fade-in on every load
- Root node pulse ring; hover glow with larger connector dots
- Stats panel: node / edge / depth counts + proportional type-breakdown bars
- 6 color-coded types: object · array · string · number · boolean · null

### ↔️ Compare
- Side-by-side diff of two independent JSON documents
- Line-level highlighting: added (green) · removed (red) · modified (amber)

### 📐 Schema
- Auto-infers **JSON Schema Draft-07** from any loaded JSON
- Detects string formats: `date-time`, `date`, `email`, `uri`, `time`
- Tree view (collapsible, with type badges and `required` indicators) and raw JSON view
- Copy to clipboard or download as `schema.json`
- Shows field count and required-field count in the toolbar

### 🟦 Types
- Generates **TypeScript `export interface` definitions** from any JSON
- Handles nested objects, arrays, union types, and optional/nullable fields
- Detects string formats as inline comments (`// email`, `// ISO date-time`, `// URL`)
- Syntax-highlighted code view (purple keywords · teal names · amber built-ins)
- Summary card grid: every interface with its fields and types at a glance
- Copy to clipboard or download as `types.d.ts`

---

## UI / UX

- **Responsive** — works on any screen size; nav collapses to icon-only on mobile
- **Dark / light mode** — persisted to `localStorage`, respects system preference on first load
- **Color-coded tabs** — each tab activates with its own gradient (emerald · violet · amber · blue · indigo)
- **Live status bar** — always-visible strip showing node count, depth, file size, and per-type breakdown
- **JSONPath extractor** — type any dot/bracket path (`$.users[0].name`) in the tree toolbar to extract and copy a value instantly
- **Keyboard shortcuts** — `⌘1–5` to switch tabs, `⌘?` to open the shortcuts overlay

---

## Stack

| Layer | Tech |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 + SWC |
| Styling | Tailwind CSS 3 + shadcn/ui |
| State | Zustand 5 |
| Icons | Lucide React |
| Toasts | Sonner |
| Testing | Vitest + Playwright |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server at localhost:5173 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Vitest) |

---

## Project Structure

```
src/
├── components/
│   ├── json/
│   │   ├── JsonInput.tsx       # Editor panel with quick actions
│   │   ├── JsonTreeView.tsx    # Tree viewer + JSONPath extractor
│   │   ├── JsonNode.tsx        # Recursive tree node renderer
│   │   ├── JsonGraph.tsx       # SVG pan/zoom node-graph
│   │   ├── JsonDiff.tsx        # Side-by-side diff
│   │   ├── JsonSchema.tsx      # JSON Schema inference
│   │   └── JsonTypes.tsx       # TypeScript interface generator
│   └── ui/                     # shadcn/ui component library
├── pages/
│   └── Index.tsx               # App shell, header, tabs, status bar
├── stores/
│   └── jsonStore.ts            # Zustand global state
└── utils/
    ├── jsonUtils.ts            # Parsing, stats, path extraction, CSV
    └── diffUtils.ts            # Deep diff algorithm
```

---

## License

MIT
