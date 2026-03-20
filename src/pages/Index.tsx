import { useJsonStore, JsonTab } from '@/stores/jsonStore';
import { Braces, GitCompareArrows, Network, FileCode2, Sun, Moon } from 'lucide-react';
import { useState, useEffect, lazy, Suspense } from 'react';
import JsonInput from '@/components/json/JsonInput';
import JsonTreeView from '@/components/json/JsonTreeView';

const JsonDiff = lazy(() => import('@/components/json/JsonDiff'));
const JsonGraph = lazy(() => import('@/components/json/JsonGraph'));
const JsonSchema = lazy(() => import('@/components/json/JsonSchema'));

const tabs: { id: JsonTab; label: string; icon: typeof Braces }[] = [
  { id: 'viewer', label: 'Viewer', icon: Braces },
  { id: 'graph', label: 'Graph', icon: Network },
  { id: 'diff', label: 'Compare', icon: GitCompareArrows },
  { id: 'schema', label: 'Schema', icon: FileCode2 },
];

function TabSkeleton() {
  return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2">
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
      Loading…
    </div>
  );
}

export default function Index() {
  const { activeTab, setActiveTab } = useJsonStore();
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="flex items-center gap-3 px-4 sm:px-5 py-2.5 border-b bg-card/80 backdrop-blur-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-2 select-none">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/30">
            <Braces className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold tracking-tight hidden sm:block">JSON Lab</span>
        </div>

        <div className="w-px h-5 bg-border hidden sm:block" />

        <nav className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60 border border-border/40">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                activeTab === id
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">{label}</span>
              {activeTab === id && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-primary opacity-60" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'viewer' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 h-full">
            <div className="border-b sm:border-b-0 sm:border-r flex flex-col min-h-0 overflow-hidden">
              <JsonInput />
            </div>
            <div className="flex flex-col min-h-0 overflow-hidden">
              <JsonTreeView />
            </div>
          </div>
        )}

        {activeTab === 'graph' && (
          <Suspense fallback={<TabSkeleton />}>
            <JsonGraph />
          </Suspense>
        )}

        {activeTab === 'diff' && (
          <Suspense fallback={<TabSkeleton />}>
            <JsonDiff />
          </Suspense>
        )}

        {activeTab === 'schema' && (
          <Suspense fallback={<TabSkeleton />}>
            <JsonSchema />
          </Suspense>
        )}
      </main>
    </div>
  );
}
