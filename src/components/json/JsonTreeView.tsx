import { useMemo, useCallback, useEffect } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { Search, ChevronsUpDown, ChevronsUp, ChevronsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function JsonTreeView() {
  const { parsedJson, searchQuery, setSearchQuery, setSearchMatches, expandAll, collapseAll, expandedPaths } = useJsonStore();

  const matches = useMemo(
    () => (parsedJson ? collectSearchMatches(parsedJson, searchQuery) : []),
    [parsedJson, searchQuery]
  );

  useEffect(() => {
    setSearchMatches(matches);
  }, [matches, setSearchMatches]);

  // Auto-expand first level when JSON loads
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
    // Merge with existing
    const current = useJsonStore.getState().expandedPaths;
    if (current.size === 0) {
      useJsonStore.setState({ expandedPaths: paths });
    }
  }, [parsedJson]);

  useEffect(() => {
    handleExpandFirst();
  }, [handleExpandFirst]);

  if (!parsedJson) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Enter valid JSON to view the tree
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b surface-1">
        <div className="flex items-center gap-1.5 flex-1 px-2 py-1 rounded-md bg-muted/50 border">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keys or values..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={expandAll} title="Expand all" className="h-7 w-7 p-0">
            <ChevronsDown className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} title="Collapse all" className="h-7 w-7 p-0">
            <ChevronsUp className="w-3.5 h-3.5" />
          </Button>
        </div>

        <span className="text-[10px] text-muted-foreground tabular-nums">
          {expandedPaths.size} expanded
        </span>
      </div>

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
