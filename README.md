# JSON Lens

JSON Lens is a local-first JSON workspace for inspecting, transforming, comparing, and understanding JSON quickly. It runs entirely in the browser with no backend, no upload step, and no account required.

## Why JSON Lens

- View raw JSON and structured tree output side by side
- Explore nested structures visually with an animated graph
- Compare two payloads with inline diff highlighting
- Generate JSON Schema and TypeScript types instantly
- Save reusable payloads locally with the Workspace Shelf
- Apply common transforms without leaving the editor

## Core Features

### Viewer

The Viewer is the main workspace for day-to-day JSON editing and inspection.

- Paste, upload, fetch from a URL, or load sample JSON
- Format, minify, copy, download, and clear input
- Browse an interactive tree view with search
- Extract values with JSONPath-style paths
- Use compact editor actions without leaving the screen

### Workspace Shelf

The Workspace Shelf is a local snippet library built into the Viewer.

- Save frequently used payloads with optional names
- Reopen recent valid JSON instantly
- Pin recent payloads into saved snippets
- Remove old saved or recent items
- Keep everything in browser local storage only

### Transforms

Transforms make the editor more useful for cleanup and reshaping tasks.

- Sort keys recursively
- Flatten nested JSON into path-based keys
- Pick selected fields with comma-separated paths
- Remove null and empty values

### Graph

The Graph tab turns JSON into a navigable structure map.

- Pan and zoom through connected nodes
- See type-colored cards for objects, arrays, and primitives
- Inspect key names, values, and child counts at a glance
- Use the live stats panel for nodes, edges, and depth

### Compare

The Compare tab is designed for payload review and debugging.

- Compare two JSON documents side by side
- Highlight added, removed, and modified lines inline
- See a structured change list below the rendered diff
- Filter changes by type for faster review

### Schema

Generate a Draft-07 style schema from the current JSON.

- Infer nested object and array shapes
- Detect common string formats like email, URI, and date-time
- Switch between tree view and raw schema JSON
- Copy or download the generated schema

### Types

Generate TypeScript definitions from JSON data.

- Infer nested interfaces
- Handle arrays and unions
- Review generated code or interface summaries
- Download the result as a `.d.ts` file

## Keyboard Shortcuts

| Shortcut | Action |
| -------- | ------ |
| `Cmd/Ctrl + 1` | Viewer |
| `Cmd/Ctrl + 2` | Graph |
| `Cmd/Ctrl + 3` | Compare |
| `Cmd/Ctrl + 4` | Schema |
| `Cmd/Ctrl + 5` | Types |

## Tech Stack

| Layer | Tech |
| ----- | ---- |
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
| ------- | ----------- |
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests with Vitest |
