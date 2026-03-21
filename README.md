# JSON Lens

JSON Lens is a local-first JSON workspace for inspecting, transforming, comparing, and understanding JSON. It runs entirely in the browser — no backend, no uploads, no account required.

## Features

### Viewer

The main workspace for day-to-day JSON editing and inspection.

- Paste, upload, fetch from a URL, or load sample JSON
- Format, minify, copy, and download input
- Interactive tree view with search across keys and values
- **JSON Path tooltip** — hover any field to see its full JSONPath (e.g. `$.users[0].address.city`)
- **Smart value annotations** — strings and numbers are automatically decorated on hover:
  - URLs → clickable external link icon
  - ISO dates & datetime strings → relative time badge (e.g. "2 days ago")
  - Unix timestamps (10 or 13-digit) → human-readable date
  - JWT tokens → click to decode header + payload inline
  - Hex color codes → inline color swatch preview
  - Email addresses → mail icon
- Extract values with JSONPath-style expressions via the Path Extractor panel
- Workspace Shelf — save, reload, and pin JSON snippets in local storage

### Graph

Visualize JSON as an interactive node graph.

- Pan, zoom, and fit-to-view controls
- Type-colored node cards (objects, arrays, strings, numbers, booleans, null)
- **JSON Path tooltip on hover** — shows full path, type badge, and value with copy-to-clipboard
- **Click to pin** the tooltip; close with the ✕ button
- Live stats panel: node count, edge count, max depth, and type breakdown

### Compare

Side-by-side diff for payload review and debugging.

- Compare two JSON documents with inline diff highlighting
- Added, removed, and modified lines clearly marked
- Structured change list with type-based filtering

### Schema

Generate a Draft-07 JSON Schema from the current JSON.

- Infers nested object and array shapes
- Detects common string formats (email, URI, date-time)
- Switch between tree view and raw schema JSON
- Copy or download the generated schema

### Types — Code Generation

Generate type definitions from JSON data in three formats:

| Target | Output |
|---|---|
| **TypeScript** | `export interface` definitions with smart comments (email, URL, date) |
| **Zod** | `z.object()` schemas with refinements (`.email()`, `.url()`, `.datetime()`, `.int()`) |
| **Python** | `TypedDict` classes with `List`, `Optional`, `Any` imports |

Switch between targets with the `TypeScript | Zod | Python` segmented control. Copy or download each result.

### Flatten

View the entire JSON as a searchable flat table of `$.path → value` pairs.

- Filter by type: string, number, boolean, null
- Live search across paths and values
- Copy individual rows, copy all as flat JSON or `.env` style, or download as `.txt`

### Transforms

Common cleanup and reshaping operations:

- Sort keys recursively
- Flatten nested JSON into dot-notation keys
- Pick selected fields by path
- Remove null and empty values

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + 1` | Viewer |
| `Cmd/Ctrl + 2` | Graph |
| `Cmd/Ctrl + 3` | Compare |
| `Cmd/Ctrl + 4` | Schema |
| `Cmd/Ctrl + 5` | Types |
| `Cmd/Ctrl + 6` | Flatten |
| `Cmd/Ctrl + ?` | Toggle shortcut reference |

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite + SWC |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Icons | Lucide React |
| Toasts | Sonner |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests with Vitest |
