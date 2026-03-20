import { useMemo, useCallback, useEffect, useState } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { extractByPath, getJsonType } from '@/utils/jsonUtils';
import { Search, ChevronsUpDown, ChevronsUp, ChevronsDown, Terminal, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import JsonNode from './JsonNode';

function collectSearchMatches(obj: unknown, query: string, path = '$'): string[] {
  if (!query) return [];
  const matches: string[] = [];
  const q = query.toLowerCase();
  if (obj === null || obj === undefined) return matches;
  if (typeof obj !== 'object') {
    if (String(obj).toLowerCase().includes(q)) matches.push(path);
    return matches;
  }
  const entries = Array.isArray(obj)
    ? obj.map((v, i) => [String(i), v] as const)
    : Object.entries(obj as Record<string, unknown>);
  for (const [key, value] of entries) {
    const childPath = Array.isArray(obj) ? `${path}[${key}]` : `${path}.${key}`;
    if (key.toLowerCase().includes(q)) matches.push(childPath);
    matches.push(...collectSearchMatches(value, q, childPath));
  }
  return matches;
}

function formatExtracted(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export default function JsonTreeView() {
  const { parsedJson, searchQuery, setSearchQuery, setSearchMatches, expandAll, collapseAll, expandedPaths } = useJsonStore();
  const [pathQuery, setPathQuery] = useState('');
  const [showExtract, setShowExtract] = useState(false);

  const matches = useMemo(
    () => (parsedJson ? collectSearchMatches(parsedJson, searchQuery) : []),
    [parsedJson, searchQuery]
  );

  useEffect(() => { setSearchMatches(matches); }, [matches, setSearchMatches]);

  const handleExpandFirst = useCallback(() => {
    if (!parsedJson) return;
    const paths = new Set<string>(['$']);
    if (typeof parsedJson === 'object' && parsedJson !== null) {
      if (Array.isArray(parsedJson)) {
        parsedJson.forEach((_, i) => paths.add(`$[${i}]`));
      } else {
        Object.keys(parsedJson as object).forEach((k) => paths.add(`$.${k}`));
      }
    }
    const current = useJsonStore.getState().expandedPaths;
    if (current.size === 0) useJsonStore.setState({ expandedPaths: paths });
  }, [parsedJson]);

  useEffect(() => { handleExpandFirst(); }, [handleExpandFirst]);

  const extracted = useMemo(() => {
    if (!parsedJson || !pathQuery.trim()) return null;
    return extractByPath(parsedJson, pathQuery);
  }, [parsedJson, pathQuery]);

  const extractedStr = useMemo(
    () => (extracted?.found ? formatExtracted(extracted.value) : null),
    [extracted]
  );

  const handleCopyExtracted = () => {
    if (!extractedStr) return;
    navigator.clipboard.writeText(extractedStr);
    toast.success('Extracted value copied');
  };

  if (!parsedJson) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
          <ChevronsUpDown className="w-5 h-5 opacity-30" />
        </div>
        <p className="text-sm">Enter valid JSON to view the tree</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b surface-1 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-1 px-2 py-1 rounded-lg bg-muted/50 border border-border/50 min-w-0">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keys or values…"
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60 min-w-0"
          />
          {searchQuery && (
            <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </span>
          )}
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={expandAll}   title="Expand all"   className="h-7 w-7 p-0">
            <ChevronsDown className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} title="Collapse all" className="h-7 w-7 p-0">
            <ChevronsUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExtract(v => !v)}
            title="Path extractor"
            className={`h-7 w-7 p-0 ${showExtract ? 'text-emerald-500' : ''}`}
          >
            <Terminal className="w-3.5 h-3.5" />
          </Button>
        </div>

        <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0 hidden sm:block">
          {expandedPaths.size} open
        </span>
      </div>

      {/* Path Extractor Panel */}
      {showExtract && (
        <div className="flex flex-col gap-0 border-b surface-2 flex-shrink-0 animate-fade-in">
          <div className="flex items-center gap-2 px-3 py-2">
            <Terminal className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <input
              type="text"
              value={pathQuery}
              onChange={(e) => setPathQuery(e.target.value)}
              placeholder="$.users[0].name  or  users[0].email"
              className="flex-1 bg-transparent text-xs font-mono outline-none placeholder:text-muted-foreground/50"
              autoFocus
              spellCheck={false}
            />
            {pathQuery && (
              <button onClick={() => setPathQuery('')} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {pathQuery && (
            <div className="px-3 pb-2">
              {extracted?.found ? (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
                  <pre className="flex-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 overflow-auto max-h-24 leading-relaxed">
                    {extractedStr}
                  </pre>
                  <button
                    onClick={handleCopyExtracted}
                    title="Copy"
                    className="flex-shrink-0 p-1 rounded hover:bg-emerald-500/10 text-emerald-500"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="px-2 py-1.5 rounded-lg bg-red-500/8 border border-red-500/20">
                  <p className="text-[11px] font-mono text-red-400">Path not found</p>
                </div>
              )}
            </div>
          )}

          {!pathQuery && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {['$', '$.users', '$.users[0]', '$.metadata.total'].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPathQuery(ex)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-auto p-2 scrollbar-thin">
        <JsonNode
          keyName={null}
          value={parsedJson}
          path="$"
          depth={0}
          isLast={true}
        />
      </div>
    </div>
  );
}
