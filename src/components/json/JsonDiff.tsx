import { useMemo, useState } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { diffJson, DiffEntry } from '@/utils/diffUtils';
import { ArrowLeftRight, GitCompare, Check, ChevronDown, ChevronUp } from 'lucide-react';

// ── Visual config ─────────────────────────────────────────────────────────────
const DS = {
  added: {
    bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    borderClass: 'border-emerald-500/60 dark:border-emerald-400/60',
    sign: '+',
    clrClass: 'text-emerald-600 dark:text-emerald-400',
    label: 'Added',
    badgeClass: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-500/40'
  },
  removed: {
    bgClass: 'bg-red-500/10 dark:bg-red-500/15',
    borderClass: 'border-red-500/60 dark:border-red-400/60',
    sign: '−',
    clrClass: 'text-red-600 dark:text-red-400',
    label: 'Removed',
    badgeClass: 'bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30 dark:border-red-500/40'
  },
  modified: {
    bgClass: 'bg-amber-500/10 dark:bg-amber-500/15',
    borderClass: 'border-amber-500/60 dark:border-amber-400/60',
    sign: '~',
    clrClass: 'text-amber-600 dark:text-amber-400',
    label: 'Modified',
    badgeClass: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/40'
  },
} as const;

const SC = {
  key:    'text-indigo-600 dark:text-indigo-300',
  str:    'text-emerald-600 dark:text-emerald-400',
  num:    'text-amber-600 dark:text-amber-400',
  tru:    'text-orange-600 dark:text-orange-400',
  fls:    'text-red-600 dark:text-red-400',
  nil:    'text-slate-500 dark:text-slate-400',
  brack:  'text-slate-500 dark:text-slate-400',
  comma:  'text-muted-foreground/60',
  colon:  'text-muted-foreground/60',
};

const INDENT_PX = 14;

// ── Recursive JSON renderer with diff highlights ───────────────────────────────
function JsonLine({
  value, keyName, path, indent, diffMap, parentPaths, isLast,
}: {
  value: unknown;
  keyName?: string | number;
  path: string;
  indent: number;
  diffMap: Map<string, DiffEntry>;
  parentPaths: Set<string>;
  isLast: boolean;
}) {
  const diff = diffMap.get(path);
  const highlight = diff ? (diff.type as keyof typeof DS) : null;
  const ds = highlight ? DS[highlight] : null;
  const isParent = !highlight && parentPaths.has(path);

  const pl = indent * INDENT_PX + 20;

  const rowClasses = `relative flex items-center min-h-[24px] pr-4 py-[1px] transition-colors border-l-[3px] ${
    ds ? `${ds.bgClass} ${ds.borderClass}` :
    isParent ? 'bg-transparent border-black/10 dark:border-white/10' : 'bg-transparent border-transparent'
  }`;

  const gutter = (
    <span className={`absolute left-1 w-[14px] text-center text-[11px] font-extrabold select-none leading-[24px] ${ds?.clrClass || 'text-transparent'}`}>
      {ds?.sign}
    </span>
  );

  const keyEl = keyName !== undefined ? (
    <>
      {typeof keyName === 'number'
        ? <span className={SC.num}>[{keyName}]</span>
        : <span className={SC.key}>"{keyName}"</span>}
      <span className={SC.colon}>:&nbsp;</span>
    </>
  ) : null;

  const closeRowClasses = `relative flex items-center min-h-[24px] pr-4 py-[1px] transition-colors bg-transparent border-l-[3px] border-transparent`;

  // Object
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div>
        <div className={rowClasses} style={{ paddingLeft: pl }}>
          {gutter}
          {keyEl}
          <span className={SC.brack}>{'{'}</span>
        </div>
        {entries.map(([k, v], i) => (
          <JsonLine key={k} value={v} keyName={k}
            path={`${path}.${k}`} indent={indent + 1}
            diffMap={diffMap} parentPaths={parentPaths}
            isLast={i === entries.length - 1}
          />
        ))}
        <div className={closeRowClasses} style={{ paddingLeft: pl }}>
          <span className={SC.brack}>{'}'}</span>
          {!isLast && <span className={SC.comma}>,</span>}
        </div>
      </div>
    );
  }

  // Array
  if (Array.isArray(value)) {
    return (
      <div>
        <div className={rowClasses} style={{ paddingLeft: pl }}>
          {gutter}
          {keyEl}
          <span className={SC.brack}>{'['}</span>
        </div>
        {value.map((item, i) => (
          <JsonLine key={i} value={item} keyName={i}
            path={`${path}.${i}`} indent={indent + 1}
            diffMap={diffMap} parentPaths={parentPaths}
            isLast={i === value.length - 1}
          />
        ))}
        <div className={closeRowClasses} style={{ paddingLeft: pl }}>
          <span className={SC.brack}>{']'}</span>
          {!isLast && <span className={SC.comma}>,</span>}
        </div>
      </div>
    );
  }

  // Primitives
  let valEl: React.ReactElement;
  if (value === null) {
    valEl = <span className={SC.nil}>null</span>;
  } else if (typeof value === 'boolean') {
    valEl = <span className={value ? SC.tru : SC.fls}>{String(value)}</span>;
  } else if (typeof value === 'number') {
    valEl = <span className={SC.num}>{String(value)}</span>;
  } else {
    const s = value as string;
    const display = s.length > 80 ? `"${s.slice(0, 78)}…"` : JSON.stringify(s);
    valEl = <span className={SC.str}>{display}</span>;
  }

  return (
    <div className={rowClasses} style={{ paddingLeft: pl }}>
      {gutter}
      {keyEl}
      {valEl}
      {!isLast && <span className={SC.comma}>,</span>}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function JsonDiff() {
  const { diffLeft, diffRight, setDiffLeft, setDiffRight, parsedDiffLeft, parsedDiffRight } = useJsonStore();
  const [filter, setFilter] = useState<'all' | 'added' | 'removed' | 'modified'>('all');
  const [inputOpen, setInputOpen] = useState(true);

  const diffs = useMemo(() => {
    if (!parsedDiffLeft || !parsedDiffRight) return null;
    return diffJson(parsedDiffLeft, parsedDiffRight);
  }, [parsedDiffLeft, parsedDiffRight]);

  const { leftDiffMap, rightDiffMap, parentPaths } = useMemo(() => {
    const leftDiffMap  = new Map<string, DiffEntry>();
    const rightDiffMap = new Map<string, DiffEntry>();
    const parentPaths  = new Set<string>();
    if (!diffs) return { leftDiffMap, rightDiffMap, parentPaths };

    for (const d of diffs) {
      if (d.type === 'modified' || d.type === 'removed') leftDiffMap.set(d.path, d);
      if (d.type === 'modified' || d.type === 'added')   rightDiffMap.set(d.path, d);
      const parts = d.path.split('.');
      for (let i = 1; i < parts.length; i++) {
        parentPaths.add(parts.slice(0, i).join('.'));
      }
    }
    return { leftDiffMap, rightDiffMap, parentPaths };
  }, [diffs]);

  const stats = useMemo(() => {
    if (!diffs) return null;
    return {
      added:    diffs.filter(d => d.type === 'added').length,
      removed:  diffs.filter(d => d.type === 'removed').length,
      modified: diffs.filter(d => d.type === 'modified').length,
      total:    diffs.length,
    };
  }, [diffs]);

  const filteredDiffs = useMemo(() => {
    if (!diffs) return [];
    if (filter === 'all') return diffs;
    return diffs.filter(d => d.type === filter);
  }, [diffs, filter]);

  const bothValid = !!parsedDiffLeft && !!parsedDiffRight;

  const swapSides = () => {
    const tmp = diffLeft;
    setDiffLeft(diffRight);
    setDiffRight(tmp);
  };

  return (
    <div className="flex flex-col h-full bg-background dark:bg-[#07091a]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 shrink-0 bg-indigo-50/50 dark:bg-gradient-to-br dark:from-indigo-500/10 dark:to-sky-500/5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-400/50 shadow-sm dark:shadow-[0_0_12px_rgba(129,140,248,0.2)]">
            <GitCompare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="font-semibold text-sm text-foreground/90 dark:text-white/85">JSON Compare</span>

          {/* Stats badges */}
          {stats && stats.total > 0 && (
            <div className="flex items-center gap-1.5">
              {stats.added > 0 && (
                <span className={`diff-badge-added px-2 py-0.5 rounded-full text-xs font-bold ${DS.added.badgeClass}`}>
                  +{stats.added}
                </span>
              )}
              {stats.removed > 0 && (
                <span className={`diff-badge-removed px-2 py-0.5 rounded-full text-xs font-bold ${DS.removed.badgeClass}`}>
                  −{stats.removed}
                </span>
              )}
              {stats.modified > 0 && (
                <span className={`diff-badge-modified px-2 py-0.5 rounded-full text-xs font-bold ${DS.modified.badgeClass}`}>
                  ~{stats.modified}
                </span>
              )}
              <span className="text-xs text-muted-foreground/60 dark:text-white/30">
                {stats.total} change{stats.total !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {diffs?.length === 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Check className="w-3 h-3" /> Identical
            </span>
          )}
        </div>

        {/* Swap + collapse */}
        <div className="flex items-center gap-2">
          <button onClick={swapSides} title="Swap left ↔ right"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all diff-btn">
            <ArrowLeftRight className="w-3 h-3" />
            <span className="hidden sm:inline">Swap</span>
          </button>
          <button onClick={() => setInputOpen(v => !v)} title="Toggle input"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all diff-btn">
            {inputOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span className="hidden sm:inline">Input</span>
          </button>
        </div>
      </div>

      {/* ── Input panels ── */}
      {inputOpen && (
        <div className="grid grid-cols-2 shrink-0 border-b border-border/60" style={{ height: 200 }}>
          {/* Left */}
          <div className="flex flex-col border-r border-border/60 bg-muted/10">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 shrink-0 bg-muted/30 dark:bg-white/5">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">ORIGINAL</span>
              {parsedDiffLeft
                ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">✓ Valid</span>
                : diffLeft
                  ? <span className="text-xs font-medium text-red-500 dark:text-red-400">✗ Invalid JSON</span>
                  : <span className="text-xs text-muted-foreground/50">Paste JSON…</span>}
            </div>
            <textarea
              value={diffLeft}
              onChange={e => setDiffLeft(e.target.value)}
              placeholder={'{\n  "key": "value"\n}'}
              spellCheck={false}
              className="flex-1 p-3 bg-transparent font-mono text-xs resize-none outline-none text-foreground/80 placeholder:text-muted-foreground/40 caret-indigo-500 dark:caret-indigo-400 leading-relaxed"
            />
          </div>

          {/* Right */}
          <div className="flex flex-col bg-muted/10">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 shrink-0 bg-muted/30 dark:bg-white/5">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">MODIFIED</span>
              {parsedDiffRight
                ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">✓ Valid</span>
                : diffRight
                  ? <span className="text-xs font-medium text-red-500 dark:text-red-400">✗ Invalid JSON</span>
                  : <span className="text-xs text-muted-foreground/50">Paste JSON…</span>}
            </div>
            <textarea
              value={diffRight}
              onChange={e => setDiffRight(e.target.value)}
              placeholder={'{\n  "key": "new_value"\n}'}
              spellCheck={false}
              className="flex-1 p-3 bg-transparent font-mono text-xs resize-none outline-none text-foreground/80 placeholder:text-muted-foreground/40 caret-indigo-500 dark:caret-indigo-400 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* ── Diff body ── */}
      <div className="flex-1 min-h-0 overflow-auto bg-card dark:bg-transparent">

        {/* Empty state */}
        {!bothValid && (
          <div className="flex flex-col items-center justify-center h-full gap-4 bg-muted/5 dark:bg-transparent">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25 shadow-sm">
              <GitCompare className="w-8 h-8 text-indigo-400 dark:text-indigo-400/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[14px] font-medium text-foreground/70 dark:text-white/50">Paste valid JSON on both sides</p>
              <p className="text-xs text-muted-foreground/60 dark:text-white/25">Differences will be highlighted inline</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground/70 dark:text-white/30">
              {Object.entries(DS).map(([type, cfg]) => (
                <span key={type} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-sm opacity-80 ${cfg.bgClass}`} />
                  {cfg.sign} {cfg.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {bothValid && diffs && (
          <>
            {/* ── Side-by-side rendered JSON ── */}
            <div className="grid grid-cols-2 border-b border-border/60">

              {/* Left panel */}
              <div className="border-r border-border/60 relative">
                <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 border-b border-border/60 bg-card/90 dark:bg-[#07091a]/96 backdrop-blur-md">
                  <span className="text-xs font-semibold text-muted-foreground">Original</span>
                  {stats && (stats.removed + stats.modified) > 0 && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-red-500/10 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 dark:border-red-500/25">
                      {stats.removed > 0 && <span>−{stats.removed}</span>}
                      {stats.removed > 0 && stats.modified > 0 && <span className="opacity-40">·</span>}
                      {stats.modified > 0 && <span className="text-amber-600 dark:text-amber-400">~{stats.modified}</span>}
                    </span>
                  )}
                </div>
                <div className="py-2 font-mono text-xs overflow-auto leading-[1.65]">
                  <JsonLine
                    value={parsedDiffLeft} path="$" indent={0}
                    diffMap={leftDiffMap} parentPaths={parentPaths} isLast={true}
                  />
                </div>
              </div>

              {/* Right panel */}
              <div className="relative">
                <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 border-b border-border/60 bg-card/90 dark:bg-[#07091a]/96 backdrop-blur-md">
                  <span className="text-xs font-semibold text-muted-foreground">Modified</span>
                  {stats && (stats.added + stats.modified) > 0 && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/25">
                      {stats.added > 0 && <span>+{stats.added}</span>}
                      {stats.added > 0 && stats.modified > 0 && <span className="opacity-40">·</span>}
                      {stats.modified > 0 && <span className="text-amber-600 dark:text-amber-400">~{stats.modified}</span>}
                    </span>
                  )}
                </div>
                <div className="py-2 font-mono text-xs overflow-auto leading-[1.65]">
                  <JsonLine
                    value={parsedDiffRight} path="$" indent={0}
                    diffMap={rightDiffMap} parentPaths={parentPaths} isLast={true}
                  />
                </div>
              </div>
            </div>

            {/* ── Changes list ── */}
            {diffs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30">
                  <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Identical JSON</p>
                <p className="text-xs text-muted-foreground/60 dark:text-white/30">Both objects have exactly the same structure and values</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Filter bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground/70 dark:text-white/40">Changes</span>
                  {(['all', 'added', 'removed', 'modified'] as const).map(f => {
                    const count = f === 'all' ? stats?.total : stats?.[f];
                    const active = filter === f;
                    const cfg = f !== 'all' ? DS[f] : null;
                    return (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                          active 
                            ? (cfg ? `border ${cfg.badgeClass}` : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/40')
                            : 'bg-transparent text-muted-foreground/60 dark:text-white/35 border-border/50 dark:border-white/10 hover:bg-muted/50'
                        }`}
                      >
                        {f === 'all' ? 'All' : cfg?.sign} {count}
                      </button>
                    );
                  })}
                </div>

                {/* Diff cards */}
                <div className="space-y-2">
                  {filteredDiffs.map((entry, i) => {
                    const cfg = DS[entry.type];
                    return (
                      <div
                        key={i}
                        className={`diff-entry-card flex items-start gap-3 rounded-xl p-3 border-l-[3px] border-r-border border-t-border border-b-border dark:border-r-white/5 dark:border-t-white/5 dark:border-b-white/5 ${cfg.borderClass} ${cfg.bgClass}`}
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        {/* Sign badge */}
                        <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black mt-0.5 bg-background dark:bg-black/20 ${cfg.clrClass} border border-border/30 dark:border-white/5 shadow-sm`}>
                          {cfg.sign}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <code className="text-xs font-bold text-foreground/90 dark:text-white/85">
                              {entry.path}
                            </code>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${cfg.badgeClass}`}>
                              {cfg.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
                            {entry.type !== 'added' && (
                              <span className="px-2 py-0.5 rounded-md bg-red-500/10 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 dark:border-red-500/30">
                                {JSON.stringify(entry.oldValue)?.length > 60
                                  ? JSON.stringify(entry.oldValue)?.slice(0, 58) + '…'
                                  : JSON.stringify(entry.oldValue)}
                              </span>
                            )}
                            {entry.type === 'modified' && (
                              <span className="text-muted-foreground/40 dark:text-white/25 text-[14px]">→</span>
                            )}
                            {entry.type !== 'removed' && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30">
                                {JSON.stringify(entry.newValue)?.length > 60
                                  ? JSON.stringify(entry.newValue)?.slice(0, 58) + '…'
                                  : JSON.stringify(entry.newValue)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
