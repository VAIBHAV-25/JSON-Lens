import { useMemo, useState, useCallback } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { getJsonType } from '@/utils/jsonUtils';
import { List, Copy, Search, X, Download } from 'lucide-react';
import { toast } from 'sonner';

// ─── Flatten JSON to leaf paths ───────────────────────────────────────────────
interface FlatEntry {
  path: string;
  value: unknown;
  type: string;
}

function flattenToEntries(obj: unknown, prefix = '$', result: FlatEntry[] = []): FlatEntry[] {
  const type = getJsonType(obj);
  if (type === 'object' && obj !== null) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      flattenToEntries(v, `${prefix}.${k}`, result);
    }
  } else if (type === 'array') {
    const arr = obj as unknown[];
    if (arr.length === 0) {
      result.push({ path: prefix, value: [], type: 'array' });
    } else {
      for (let i = 0; i < arr.length; i++) {
        flattenToEntries(arr[i], `${prefix}[${i}]`, result);
      }
    }
  } else {
    result.push({ path: prefix, value: obj, type });
  }
  return result;
}

function formatValue(value: unknown, type: string): string {
  if (type === 'null') return 'null';
  if (type === 'string') return `"${String(value)}"`;
  return String(value);
}

// ─── Value colors matching graph palette ──────────────────────────────────────
const VALUE_COLORS: Record<string, string> = {
  string:  'text-emerald-400',
  number:  'text-amber-400',
  boolean: 'text-orange-400',
  null:    'text-slate-400',
  array:   'text-sky-400',
};

const TYPE_DOT: Record<string, string> = {
  string:  'bg-emerald-400',
  number:  'bg-amber-400',
  boolean: 'bg-orange-400',
  null:    'bg-slate-400',
  array:   'bg-sky-400',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function JsonFlatten() {
  const { parsedJson } = useJsonStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const entries = useMemo(
    () => (parsedJson ? flattenToEntries(parsedJson) : []),
    [parsedJson]
  );

  const typeOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) counts[e.type] = (counts[e.type] || 0) + 1;
    return counts;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (!q) return true;
      return e.path.toLowerCase().includes(q) || String(e.value).toLowerCase().includes(q);
    });
  }, [entries, search, typeFilter]);

  const copyRow = useCallback((e: FlatEntry, idx: number) => {
    navigator.clipboard.writeText(`${e.path}: ${formatValue(e.value, e.type)}`);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1200);
  }, []);

  const copyAll = useCallback((format: 'json' | 'flat') => {
    let text: string;
    if (format === 'json') {
      const obj: Record<string, unknown> = {};
      filtered.forEach((e) => { obj[e.path] = e.value; });
      text = JSON.stringify(obj, null, 2);
    } else {
      text = filtered.map((e) => `${e.path}=${formatValue(e.value, e.type)}`).join('\n');
    }
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  }, [filtered]);

  const downloadFlat = useCallback(() => {
    const text = filtered.map((e) => `${e.path}: ${formatValue(e.value, e.type)}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'flat.txt'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded flat.txt');
  }, [filtered]);

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!parsedJson) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <List className="w-7 h-7 text-cyan-400 opacity-70" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">No JSON loaded</p>
          <p className="text-xs text-muted-foreground/60">Load JSON in the Viewer tab to see all paths</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b surface-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold">Flatten View</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          <span className="font-mono font-semibold text-cyan-400">{filtered.length}</span>
          {filtered.length !== entries.length && <span className="text-muted-foreground/50"> / {entries.length}</span>}
          &nbsp;paths
        </span>

        {/* Search */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[140px] px-2 py-1 rounded-lg bg-muted/50 border border-border/50">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search paths or values…"
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Type filter pills */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${typeFilter === 'all' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'border-border/40 text-muted-foreground hover:text-foreground'}`}
          >
            all
          </button>
          {Object.entries(typeOptions).map(([t, n]) => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
              className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${typeFilter === t ? 'bg-muted border-border text-foreground' : 'border-border/40 text-muted-foreground hover:text-foreground'}`}
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${TYPE_DOT[t] || 'bg-muted-foreground'}`} />
              {t} ({n})
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => copyAll('flat')}
            title="Copy as .env style"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Copy className="w-3 h-3" /> .env
          </button>
          <button
            onClick={() => copyAll('json')}
            title="Copy as flat JSON"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Copy className="w-3 h-3" /> JSON
          </button>
          <button
            onClick={downloadFlat}
            title="Download as .txt"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground/50">
            No matches found
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b surface-1">
                <th className="text-left px-4 py-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider w-1/2">Path</th>
                <th className="text-left px-3 py-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Value</th>
                <th className="text-left px-3 py-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider w-16">Type</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, idx) => (
                <tr
                  key={entry.path}
                  className="border-b border-border/20 hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-4 py-1.5 font-mono text-[11px] text-cyan-400/80 align-middle">
                    <span className="break-all">{entry.path}</span>
                  </td>
                  <td className={`px-3 py-1.5 font-mono text-[11px] align-middle max-w-xs ${VALUE_COLORS[entry.type] || 'text-foreground'}`}>
                    <span className="break-all line-clamp-2">{formatValue(entry.value, entry.type)}</span>
                  </td>
                  <td className="px-3 py-1.5 align-middle">
                    <span className="inline-flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TYPE_DOT[entry.type] || 'bg-muted-foreground'}`} />
                      <span className="text-[10px] text-muted-foreground">{entry.type}</span>
                    </span>
                  </td>
                  <td className="px-2 py-1.5 align-middle">
                    <button
                      onClick={() => copyRow(entry, idx)}
                      title="Copy path: value"
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                    >
                      {copiedIdx === idx ? (
                        <span className="text-emerald-400 text-[10px]">✓</span>
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
