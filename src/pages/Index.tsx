import { useJsonStore, JsonTab } from "@/stores/jsonStore";
import {
  Braces,
  GitCompareArrows,
  Network,
  FileCode2,
  Code2,
  List,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  FileText,
} from "lucide-react";

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import JsonInput from "@/components/json/JsonInput";
import JsonTreeView from "@/components/json/JsonTreeView";
import { computeStats } from "@/utils/jsonUtils";

const JsonDiff    = lazy(() => import("@/components/json/JsonDiff"));
const JsonGraph   = lazy(() => import("@/components/json/JsonGraph"));
const JsonSchema  = lazy(() => import("@/components/json/JsonSchema"));
const JsonTypes   = lazy(() => import("@/components/json/JsonTypes"));
const JsonFlatten = lazy(() => import("@/components/json/JsonFlatten"));
const JsonToon    = lazy(() => import("@/components/json/JsonToon"));

interface TabDef {
  id: JsonTab;
  label: string;
  icon: typeof Braces;
  gradient: string;
  ring: string;
}

const TABS: TabDef[] = [
  {
    id: "viewer",
    label: "Viewer",
    icon: Braces,
    gradient: "from-emerald-500 to-teal-500",
    ring: "ring-emerald-500/40",
  },
  {
    id: "graph",
    label: "Graph",
    icon: Network,
    gradient: "from-violet-500 to-purple-600",
    ring: "ring-violet-500/40",
  },
  {
    id: "diff",
    label: "Compare",
    icon: GitCompareArrows,
    gradient: "from-amber-500 to-orange-500",
    ring: "ring-amber-500/40",
  },
  {
    id: "schema",
    label: "Schema",
    icon: FileCode2,
    gradient: "from-blue-500 to-cyan-500",
    ring: "ring-blue-500/40",
  },
  {
    id: "types",
    label: "Types",
    icon: Code2,
    gradient: "from-indigo-500 to-violet-500",
    ring: "ring-indigo-500/40",
  },
  {
    id: "flatten",
    label: "Flatten",
    icon: List,
    gradient: "from-cyan-500 to-sky-500",
    ring: "ring-cyan-500/40",
  },
  {
    id: "toon",
    label: "TOON",
    icon: FileText,
    gradient: "from-fuchsia-500 to-pink-500",
    ring: "ring-fuchsia-500/40",
  },
];


function formatBytes(raw: string): string {
  const b = new TextEncoder().encode(raw).length;
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function TabSkeleton() {
  return (
    <div className="flex items-center justify-center h-full gap-2 text-sm text-muted-foreground">
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
      Loading…
    </div>
  );
}

export default function Index() {
  const { activeTab, setActiveTab, parsedJson, rawInput, parseError } =
    useJsonStore();

  const [isDark, setIsDark] = useState(() => {
    const saved =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("json-lab-theme")
        : null;
    if (saved) return saved === "dark";
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });

  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("json-lab-theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "?") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }
      if (mod && /^[1-6]$/.test(e.key)) {
        e.preventDefault();
        const tab = TABS[parseInt(e.key) - 1];
        if (tab) setActiveTab(tab.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActiveTab]);

  const stats = useMemo(
    () => (parsedJson ? computeStats(parsedJson) : null),
    [parsedJson],
  );
  const byteSize = useMemo(
    () => (rawInput ? formatBytes(rawInput) : null),
    [rawInput],
  );
  const hasInput = rawInput.trim() !== "";
  const isValid = hasInput && parsedJson !== null;;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="app-header flex items-center gap-3 px-4 sm:px-5 py-2 border-b flex-shrink-0 z-20 relative">
        {/* Brand */}
        <div className="flex items-center gap-2.5 select-none flex-shrink-0">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/30 logo-glow">
            <Braces className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-extrabold tracking-tight gradient-brand hidden sm:block">
            JSON Lens
          </span>
        </div>

        <div className="w-px h-5 bg-border/60 hidden sm:block flex-shrink-0" />

        {/* Tabs */}
        <nav className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted/50 border border-border/40 flex-shrink-0">
          {TABS.map(({ id, label, icon: Icon, gradient, ring }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === id
                  ? `bg-gradient-to-r ${gradient} text-white shadow-md ${ring} ring-1`
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Theme toggle */}
        <button
          onClick={() => setIsDark((d) => !d)}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* ── Keyboard Shortcuts Overlay ─────────────────────────────── */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-card border rounded-2xl shadow-2xl p-5 w-72 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <Keyboard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Keyboard Shortcuts</span>
            </div>
            {[
              ["⌘ 1", "Viewer"],
              ["⌘ 2", "Graph"],
              ["⌘ 3", "Compare"],
              ["⌘ 4", "Schema"],
              ["⌘ 5", "Types"],
              ["⌘ 6", "Flatten"],
              ["⌘ 7", "TOON"],
              ["⌘ ?", "Toggle shortcuts"],
            ].map(([key, desc]) => (
              <div
                key={key}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-muted-foreground">{desc}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono">
                  {key}
                </kbd>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground/50 pt-1 text-center">
              Click anywhere to close
            </p>
          </div>
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "viewer" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 h-full">
            <div className="border-b sm:border-b-0 sm:border-r flex flex-col min-h-0 overflow-hidden">
              <JsonInput />
            </div>
            <div className="flex flex-col min-h-0 overflow-hidden">
              <JsonTreeView />
            </div>
          </div>
        )}
        {activeTab === "graph" && (
          <Suspense fallback={<TabSkeleton />}>
            <JsonGraph />
          </Suspense>
        )}
        {activeTab === "diff" && (
          <Suspense fallback={<TabSkeleton />}>
            <JsonDiff />
          </Suspense>
        )}
        {activeTab === "schema" && (
          <Suspense fallback={<TabSkeleton />}>
            <JsonSchema />
          </Suspense>
        )}
        {activeTab === "types" && (
          <Suspense fallback={<TabSkeleton />}>
            <JsonTypes />
          </Suspense>
        )}
        {activeTab === "flatten" && (
          <Suspense fallback={<TabSkeleton />}>
            <JsonFlatten />
          </Suspense>
        )}
        {activeTab === "toon" && (
          <Suspense fallback={<TabSkeleton />}>
            <JsonToon />
          </Suspense>
        )}
      </main>

      {/* ── Status Bar ─────────────────────────────────────────────── */}
      <footer
        className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 border-t surface-1 flex-shrink-0 overflow-x-auto transition-all duration-300 ${
          hasInput ? "h-7 opacity-100" : "h-0 opacity-0 pointer-events-none"
        }`}
      >
        {isValid ? (
          <span className="flex items-center gap-1 text-emerald-500 font-semibold text-[11px] flex-shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Valid
          </span>
        ) : parseError ? (
          <span
            className="flex items-center gap-1 text-red-400 font-semibold text-[11px] flex-shrink-0 max-w-xs truncate"
            title={parseError}
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {parseError.split(":")[0]}
          </span>
        ) : null}

        {stats && (
          <>
            <span className="text-border/60 text-[11px]">·</span>
            <span className="text-[11px] text-muted-foreground flex-shrink-0">
              <span className="font-mono font-semibold text-foreground">{stats.total}</span> nodes
            </span>
            <span className="text-border/60 text-[11px]">·</span>
            <span className="text-[11px] text-muted-foreground flex-shrink-0">
              depth <span className="font-mono font-semibold text-foreground">{stats.maxDepth}</span>
            </span>
            <span className="text-border/60 text-[11px]">·</span>
            <span className="text-[11px] text-muted-foreground flex-shrink-0">{byteSize}</span>
          </>
        )}
      </footer>
    </div>
  );
}
