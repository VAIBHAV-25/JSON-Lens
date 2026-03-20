import { useMemo, useState } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { diffJson, DiffEntry } from '@/utils/diffUtils';
import { ArrowLeftRight, Edit3, GitCompare, Check, ChevronDown, ChevronUp } from 'lucide-react';

// ── Visual config ─────────────────────────────────────────────────────────────
const DS = {
  added:    { bg: 'rgba(52,211,153,0.13)',  border: '#34d399', sign: '+', clr: '#34d399', label: 'Added',    badgeBg: 'rgba(52,211,153,0.18)'  },
  removed:  { bg: 'rgba(248,113,113,0.11)', border: '#f87171', sign: '−', clr: '#f87171', label: 'Removed',  badgeBg: 'rgba(248,113,113,0.18)' },
  modified: { bg: 'rgba(251,191,36,0.10)',  border: '#fbbf24', sign: '~', clr: '#fbbf24', label: 'Modified', badgeBg: 'rgba(251,191,36,0.15)'  },
} as const;

const SC = {
  key:    '#c4b5fd',
  str:    '#86efac',
  num:    '#fbbf24',
  tru:    '#4ade80',
  fls:    '#f87171',
  nil:    '#94a3b8',
  brack:  '#64748b',
  comma:  '#475569',
  colon:  '#475569',
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

  const rowStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    minHeight: 24,
    paddingLeft: pl,
    paddingRight: 16,
    paddingTop: 1,
    paddingBottom: 1,
    background: ds ? ds.bg : 'transparent',
    borderLeft: ds
      ? `3px solid ${ds.border}`
      : isParent
        ? '3px solid rgba(255,255,255,0.07)'
        : '3px solid transparent',
    transition: 'background 0.2s',
  };

  const gutter = (
    <span style={{
      position: 'absolute', left: 4, width: 14, textAlign: 'center',
      fontSize: 11, fontWeight: 800, color: ds ? ds.clr : 'transparent',
      userSelect: 'none', lineHeight: '24px',
    }}>
      {ds?.sign}
    </span>
  );

  const keyEl = keyName !== undefined ? (
    <>
      {typeof keyName === 'number'
        ? <span style={{ color: SC.num }}>[{keyName}]</span>
        : <span style={{ color: SC.key }}>"{keyName}"</span>}
      <span style={{ color: SC.colon }}>:&nbsp;</span>
    </>
  ) : null;

  const closeRowStyle: React.CSSProperties = {
    ...rowStyle,
    background: 'transparent',
    borderLeft: '3px solid transparent',
  };

  // Object
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div>
        <div style={rowStyle}>
          {gutter}
          {keyEl}
          <span style={{ color: SC.brack }}>{'{'}</span>
        </div>
        {entries.map(([k, v], i) => (
          <JsonLine key={k} value={v} keyName={k}
            path={`${path}.${k}`} indent={indent + 1}
            diffMap={diffMap} parentPaths={parentPaths}
            isLast={i === entries.length - 1}
          />
        ))}
        <div style={{ ...closeRowStyle, paddingLeft: pl }}>
          <span style={{ color: SC.brack }}>{'}'}</span>
          {!isLast && <span style={{ color: SC.comma }}>,</span>}
        </div>
      </div>
    );
  }

  // Array
  if (Array.isArray(value)) {
    return (
      <div>
        <div style={rowStyle}>
          {gutter}
          {keyEl}
          <span style={{ color: SC.brack }}>{'['}</span>
        </div>
        {value.map((item, i) => (
          <JsonLine key={i} value={item} keyName={i}
            path={`${path}.${i}`} indent={indent + 1}
            diffMap={diffMap} parentPaths={parentPaths}
            isLast={i === value.length - 1}
          />
        ))}
        <div style={{ ...closeRowStyle, paddingLeft: pl }}>
          <span style={{ color: SC.brack }}>{']'}</span>
          {!isLast && <span style={{ color: SC.comma }}>,</span>}
        </div>
      </div>
    );
  }

  // Primitives
  let valEl: React.ReactElement;
  if (value === null) {
    valEl = <span style={{ color: SC.nil }}>null</span>;
  } else if (typeof value === 'boolean') {
    valEl = <span style={{ color: value ? SC.tru : SC.fls }}>{String(value)}</span>;
  } else if (typeof value === 'number') {
    valEl = <span style={{ color: SC.num }}>{String(value)}</span>;
  } else {
    const s = value as string;
    const display = s.length > 80 ? `"${s.slice(0, 78)}…"` : JSON.stringify(s);
    valEl = <span style={{ color: SC.str }}>{display}</span>;
  }

  return (
    <div style={rowStyle}>
      {gutter}
      {keyEl}
      {valEl}
      {!isLast && <span style={{ color: SC.comma }}>,</span>}
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
    <div className="flex flex-col h-full" style={{ background: '#07091a' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
        style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.12) 0%, rgba(56,189,248,0.07) 100%)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(129,140,248,0.2)', border: '1px solid rgba(129,140,248,0.45)', boxShadow: '0 0 12px rgba(129,140,248,0.2)' }}>
            <GitCompare className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>JSON Compare</span>

          {/* Stats badges */}
          {stats && stats.total > 0 && (
            <div className="flex items-center gap-1.5">
              {stats.added > 0 && (
                <span className="diff-badge-added px-2 py-0.5 rounded-full text-xs font-bold">
                  +{stats.added}
                </span>
              )}
              {stats.removed > 0 && (
                <span className="diff-badge-removed px-2 py-0.5 rounded-full text-xs font-bold">
                  −{stats.removed}
                </span>
              )}
              {stats.modified > 0 && (
                <span className="diff-badge-modified px-2 py-0.5 rounded-full text-xs font-bold">
                  ~{stats.modified}
                </span>
              )}
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {stats.total} change{stats.total !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {diffs?.length === 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
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
        <div className="grid grid-cols-2 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', height: 200 }}>
          {/* Left */}
          <div className="flex flex-col border-r" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between px-3 py-1.5 border-b shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <span className="text-xs font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>ORIGINAL</span>
              {parsedDiffLeft
                ? <span className="text-xs font-medium" style={{ color: '#34d399' }}>✓ Valid</span>
                : diffLeft
                  ? <span className="text-xs font-medium" style={{ color: '#f87171' }}>✗ Invalid JSON</span>
                  : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Paste JSON…</span>}
            </div>
            <textarea
              value={diffLeft}
              onChange={e => setDiffLeft(e.target.value)}
              placeholder={'{\n  "key": "value"\n}'}
              spellCheck={false}
              className="flex-1 p-3 bg-transparent font-mono text-xs resize-none outline-none"
              style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, caretColor: '#818cf8' }}
            />
          </div>

          {/* Right */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-3 py-1.5 border-b shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <span className="text-xs font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>MODIFIED</span>
              {parsedDiffRight
                ? <span className="text-xs font-medium" style={{ color: '#34d399' }}>✓ Valid</span>
                : diffRight
                  ? <span className="text-xs font-medium" style={{ color: '#f87171' }}>✗ Invalid JSON</span>
                  : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Paste JSON…</span>}
            </div>
            <textarea
              value={diffRight}
              onChange={e => setDiffRight(e.target.value)}
              placeholder={'{\n  "key": "new_value"\n}'}
              spellCheck={false}
              className="flex-1 p-3 bg-transparent font-mono text-xs resize-none outline-none"
              style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, caretColor: '#818cf8' }}
            />
          </div>
        </div>
      )}

      {/* ── Diff body ── */}
      <div className="flex-1 min-h-0 overflow-auto">

        {/* Empty state */}
        {!bothValid && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)' }}>
              <GitCompare className="w-8 h-8" style={{ color: 'rgba(129,140,248,0.6)' }} />
            </div>
            <div className="text-center space-y-1">
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 500 }}>Paste valid JSON on both sides</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Differences will be highlighted inline</p>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {Object.entries(DS).map(([type, cfg]) => (
                <span key={type} className="flex items-center gap-1.5">
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: cfg.border, display: 'inline-block', opacity: 0.8 }} />
                  {cfg.sign} {cfg.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {bothValid && diffs && (
          <>
            {/* ── Side-by-side rendered JSON ── */}
            <div className="grid grid-cols-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>

              {/* Left panel */}
              <div className="border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 border-b"
                  style={{ background: 'rgba(7,9,26,0.96)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Original</span>
                  {stats && (stats.removed + stats.modified) > 0 && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                      {stats.removed > 0 && <span>−{stats.removed}</span>}
                      {stats.removed > 0 && stats.modified > 0 && <span style={{ opacity: 0.4 }}>·</span>}
                      {stats.modified > 0 && <span>~{stats.modified}</span>}
                    </span>
                  )}
                </div>
                <div className="py-2 font-mono text-xs overflow-auto" style={{ lineHeight: 1.65 }}>
                  <JsonLine
                    value={parsedDiffLeft} path="$" indent={0}
                    diffMap={leftDiffMap} parentPaths={parentPaths} isLast={true}
                  />
                </div>
              </div>

              {/* Right panel */}
              <div>
                <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 border-b"
                  style={{ background: 'rgba(7,9,26,0.96)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Modified</span>
                  {stats && (stats.added + stats.modified) > 0 && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
                      {stats.added > 0 && <span>+{stats.added}</span>}
                      {stats.added > 0 && stats.modified > 0 && <span style={{ opacity: 0.4 }}>·</span>}
                      {stats.modified > 0 && <span>~{stats.modified}</span>}
                    </span>
                  )}
                </div>
                <div className="py-2 font-mono text-xs overflow-auto" style={{ lineHeight: 1.65 }}>
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
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}>
                  <Check className="w-6 h-6" style={{ color: '#34d399' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: '#34d399' }}>Identical JSON</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Both objects have exactly the same structure and values</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Filter bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Changes</span>
                  {(['all', 'added', 'removed', 'modified'] as const).map(f => {
                    const count = f === 'all' ? stats?.total : stats?.[f];
                    const active = filter === f;
                    const cfg = f !== 'all' ? DS[f] : null;
                    return (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={active
                          ? { background: cfg ? cfg.badgeBg : 'rgba(129,140,248,0.2)', color: cfg ? cfg.clr : '#a5b4fc', border: `1px solid ${cfg ? cfg.border + '60' : 'rgba(129,140,248,0.4)'}` }
                          : { color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent' }
                        }
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
                        className="diff-entry-card flex items-start gap-3 rounded-xl p-3"
                        style={{
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}22`,
                          borderLeft: `3px solid ${cfg.border}`,
                          animationDelay: `${i * 30}ms`,
                        }}
                      >
                        {/* Sign badge */}
                        <span className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black mt-0.5"
                          style={{ background: `${cfg.border}25`, color: cfg.clr }}>
                          {cfg.sign}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <code className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                              {entry.path}
                            </code>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: cfg.badgeBg, color: cfg.clr }}>
                              {cfg.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
                            {entry.type !== 'added' && (
                              <span className="px-2 py-0.5 rounded-md"
                                style={{ background: 'rgba(248,113,113,0.12)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.2)' }}>
                                {JSON.stringify(entry.oldValue)?.length > 60
                                  ? JSON.stringify(entry.oldValue)?.slice(0, 58) + '…'
                                  : JSON.stringify(entry.oldValue)}
                              </span>
                            )}
                            {entry.type === 'modified' && (
                              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>→</span>
                            )}
                            {entry.type !== 'removed' && (
                              <span className="px-2 py-0.5 rounded-md"
                                style={{ background: 'rgba(52,211,153,0.12)', color: '#86efac', border: '1px solid rgba(52,211,153,0.2)' }}>
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
