# JSON Lens

A fast, browser-based JSON toolkit built with React, TypeScript, and Vite. No server. No sign-up. Everything runs locally in your browser.

## Features

### Viewer
Paste, upload a `.json` file, fetch from a URL, or load sample data. The left panel is a raw editor with Format, Minify, Copy, Save, and Clear actions. The right panel is an interactive collapsible tree with search, expand/collapse all, and a JSONPath extractor for querying specific values.

### Graph
Pan-and-zoom node graph that maps the entire JSON structure as a tree of connected cards. Each node shows the key name, value preview, and type. Nodes are color-coded by type (object, array, string, number, boolean, null) with animated flowing edges and a live stats panel (node count, edge count, depth).

### Compare
Side-by-side diff of two JSON documents. Both panels render the full syntax-highlighted JSON with inline diff markers — green `+` for added keys, red `−` for removed, amber `~` for modified values. A filterable changes list below shows every diff with old → new values.

### Schema
Auto-infers a JSON Schema (Draft-07) from any loaded JSON. Supports nested objects, arrays, string format detection (date-time, email, URI), and optional/required fields. Toggle between tree view and raw JSON. One-click copy and download.

### Types
Generates TypeScript interface definitions from any JSON. Handles nested objects, arrays with union types, and primitive type detection. Switch between code view and a summary of all generated interfaces. Download as a `.d.ts` file.

## Stack

| Layer     | Tech                     |
| --------- | ------------------------ |
| Framework | React 18 + TypeScript    |
| Build     | Vite + SWC               |
| Styling   | Tailwind CSS + shadcn/ui |
| State     | Zustand                  |
| Icons     | Lucide React             |
| Toasts    | Sonner                   |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Keyboard Shortcuts

| Shortcut | Action          |
| -------- | --------------- |
| `⌘ 1`   | Viewer          |
| `⌘ 2`   | Graph           |
| `⌘ 3`   | Compare         |
| `⌘ 4`   | Schema          |
| `⌘ 5`   | Types           |

## Scripts

| Command             | Description              |
| ------------------- | ------------------------ |
| `npm run dev`       | Start dev server         |
| `npm run build`     | Production build         |
| `npm run preview`   | Preview production build |
| `npm run lint`      | Run ESLint               |
| `npm test`          | Run unit tests (Vitest)  |
