# JSON Lens

A fast, browser-based JSON toolkit built with React, TypeScript, and Vite.

## Features

- **Viewer** — Paste, upload, or fetch JSON. Interactive collapsible tree with search, expand/collapse all, copy path, format, minify, and download.
- **Graph** — Pan/zoom node-graph visualization of any JSON structure. Rectangular nodes with type-colored accents, stats panel, and zoom-to-cursor.
- **Compare** — Side-by-side diff of two JSON documents with added/removed/modified highlighting.
- **Schema** — Auto-infers a JSON Schema (Draft-07) from any loaded JSON. Tree and raw JSON views with copy and download.

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

## Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start dev server         |
| `npm run build`   | Production build         |
| `npm run preview` | Preview production build |
| `npm run lint`    | Run ESLint               |
| `npm test`        | Run unit tests (Vitest)  |
