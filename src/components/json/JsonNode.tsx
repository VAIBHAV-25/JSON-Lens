import { memo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Copy, ChevronDown, ExternalLink, Calendar, Key, Mail, Palette } from 'lucide-react';
import { useJsonStore } from '@/stores/jsonStore';
import { getJsonType, getItemCount } from '@/utils/jsonUtils';
import { toast } from 'sonner';

interface JsonNodeProps {
  keyName: string | number | null;
  value: unknown;
  path: string;
  depth: number;
  isLast: boolean;
}

const TYPE_BADGES: Record<string, string> = {
  string: 'bg-syntax-string/10 text-syntax-string',
  number: 'bg-syntax-number/10 text-syntax-number',
  boolean: 'bg-syntax-boolean/10 text-syntax-boolean',
  null: 'bg-muted text-syntax-null',
  array: 'bg-primary/10 text-primary',
  object: 'bg-primary/10 text-primary',
};

const TYPE_COLORS: Record<string, { accent: string; bg: string; border: string; text: string }> = {
  string:  { accent: '#34d399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.35)',  text: '#6ee7b7' },
  number:  { accent: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.35)',  text: '#fde68a' },
  boolean: { accent: '#fb923c', bg: 'rgba(251,146,60,0.10)',  border: 'rgba(251,146,60,0.35)',  text: '#fed7aa' },
  null:    { accent: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.25)', text: '#cbd5e1' },
  array:   { accent: '#38bdf8', bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.30)',  text: '#7dd3fc' },
  object:  { accent: '#818cf8', bg: 'rgba(129,140,248,0.10)', border: 'rgba(129,140,248,0.30)', text: '#c7d2fe' },
};

// ─── Smart annotation detection ──────────────────────────────────────────────
type Annotation =
  | { kind: 'url'; href: string }
  | { kind: 'date'; display: string; iso: string }
  | { kind: 'unix-ts'; display: string }
  | { kind: 'jwt'; header: string; payload: string }
  | { kind: 'color'; hex: string }
  | { kind: 'email' };

function detectAnnotation(value: unknown, type: string): Annotation | null {
  if (type === 'string') {
    const s = value as string;
    // URL
    if (/^https?:\/\/.{4}/i.test(s)) return { kind: 'url', href: s };
    // JWT: three base64url segments separated by dots
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s) && s.length > 20) {
      try {
        const [h, p] = s.split('.');
        const header  = JSON.stringify(JSON.parse(atob(h.replace(/-/g,'+').replace(/_/g,'/'))), null, 2);
        const payload = JSON.stringify(JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/'))), null, 2);
        return { kind: 'jwt', header, payload };
      } catch { /* not a JWT */ }
    }
    // ISO datetime / date
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const display = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
          Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 'day'
        );
        return { kind: 'date', display, iso: d.toLocaleString() };
      }
    }
    // Hex color
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s))
      return { kind: 'color', hex: s };
    // Email
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(s))
      return { kind: 'email' };
  }
  if (type === 'number') {
    const n = value as number;
    // Unix timestamp: 10-digit (seconds) or 13-digit (milliseconds)
    if (Number.isInteger(n) && ((n > 1e9 && n < 2e10) || (n > 1e12 && n < 2e13))) {
      const ms = n > 1e12 ? n : n * 1000;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return { kind: 'unix-ts', display: d.toLocaleString() };
    }
  }
  return null;
}

// ─── Annotation badge/icon rendered inline beside the value ──────────────────
function AnnotationBadge({ ann }: { ann: Annotation }) {
  const [showJwt, setShowJwt] = useState(false);

  if (ann.kind === 'url') {
    return (
      <a
        href={ann.href}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-1 inline-flex items-center text-sky-400 hover:text-sky-300 opacity-0 group-hover:opacity-100 transition-opacity"
        title={ann.href}
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  if (ann.kind === 'date') {
    return (
      <span
        className="ml-1.5 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-default"
        title={ann.iso}
      >
        <Calendar className="w-2.5 h-2.5" />
        {ann.display}
      </span>
    );
  }

  if (ann.kind === 'unix-ts') {
    return (
      <span
        className="ml-1.5 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-default"
        title="Unix timestamp"
      >
        <Calendar className="w-2.5 h-2.5" />
        {ann.display}
      </span>
    );
  }

  if (ann.kind === 'color') {
    return (
      <span
        className="ml-1.5 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-default"
        title={ann.hex}
      >
        <span
          style={{ width: 10, height: 10, borderRadius: 3, background: ann.hex, display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}
        />
        <Palette className="w-2.5 h-2.5 text-muted-foreground" />
      </span>
    );
  }

  if (ann.kind === 'email') {
    return (
      <span className="ml-1.5 inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60" title="Email address">
        <Mail className="w-3 h-3" />
      </span>
    );
  }

  if (ann.kind === 'jwt') {
    return (
      <span className="relative">
        <button
          className="ml-1.5 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
          title="JWT token — click to decode"
          onClick={(e) => { e.stopPropagation(); setShowJwt((v) => !v); }}
        >
          <Key className="w-2.5 h-2.5" />
          JWT
        </button>
        {showJwt && createPortal(
          <div
            className="fixed z-[9999] w-80 rounded-xl border border-amber-500/30 shadow-2xl"
            style={{ background: 'rgba(6,9,24,0.98)', backdropFilter: 'blur(18px)', padding: '12px 14px', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.1em' }}>JWT Decoded</span>
              <button onClick={() => setShowJwt(false)} style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>✕ close</button>
            </div>
            <div className="space-y-2">
              <div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Header</div>
                <pre style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#fde68a', background: 'rgba(251,191,36,0.07)', borderRadius: 7, padding: '7px 10px', border: '1px solid rgba(251,191,36,0.15)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{ann.header}</pre>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Payload</div>
                <pre style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#6ee7b7', background: 'rgba(52,211,153,0.07)', borderRadius: 7, padding: '7px 10px', border: '1px solid rgba(52,211,153,0.15)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '220px', overflow: 'auto' }}>{ann.payload}</pre>
              </div>
            </div>
          </div>,
          document.body
        )}
      </span>
    );
  }

  return null;
}

// ─── Smart ValueDisplay (with annotation) ────────────────────────────────────
function ValueDisplay({ value }: { value: unknown }) {
  const type = getJsonType(value);
  const ann = detectAnnotation(value, type);

  if (type === 'string') {
    return (
      <span className="inline-flex items-center gap-0">
        <span className="json-string font-mono">"{String(value)}"</span>
        {ann && <AnnotationBadge ann={ann} />}
      </span>
    );
  }
  if (type === 'number') {
    return (
      <span className="inline-flex items-center gap-0">
        <span className="json-number font-mono">{String(value)}</span>
        {ann && <AnnotationBadge ann={ann} />}
      </span>
    );
  }
  if (type === 'boolean') {
    return <span className="json-boolean font-mono">{String(value)}</span>;
  }
  if (type === 'null') {
    return <span className="json-null font-mono">null</span>;
  }
  return null;
}

// ─── Path Tooltip (portal-rendered, fixed position, display-only) ───────────
function PathTooltip({
  path,
  type,
  mousePos,
}: {
  path: string;
  type: string;
  mousePos: { x: number; y: number };
}) {
  const cfg = TYPE_COLORS[type] || TYPE_COLORS.null;
  const TOOLTIP_W = 340;
  const TOOLTIP_H = 76;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const rawX = mousePos.x + 14;
  const rawY = mousePos.y + 18;
  const left = rawX + TOOLTIP_W > vw ? mousePos.x - TOOLTIP_W - 10 : rawX;
  const top  = rawY + TOOLTIP_H > vh ? mousePos.y - TOOLTIP_H - 10 : rawY;

  return createPortal(
    <div
      style={{
        position: 'fixed', left, top, width: TOOLTIP_W, zIndex: 9999,
        borderRadius: 12, background: 'rgba(6,9,24,0.97)',
        border: `1.5px solid ${cfg.border}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 14px ${cfg.bg}`,
        backdropFilter: 'blur(18px)', padding: '10px 12px', pointerEvents: 'none',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: cfg.accent }}>JSON Path</span>
        <span style={{ fontSize: 9, fontWeight: 600, padding: '1.5px 7px', borderRadius: 5, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}>{type}</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '6px 10px', border: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 12, color: cfg.text, wordBreak: 'break-all', lineHeight: 1.5 }}>{path}</span>
      </div>
    </div>,
    document.body
  );
}

// ─── Main node ────────────────────────────────────────────────────────────────
const JsonNode = memo(function JsonNode({ keyName, value, path, depth, isLast }: JsonNodeProps) {
  const { expandedPaths, togglePath, searchQuery, searchMatches } = useJsonStore();
  const type = getJsonType(value);
  const isExpandable = type === 'object' || type === 'array';
  const isExpanded = expandedPaths.has(path);
  const count = isExpandable ? getItemCount(value) : 0;

  const isSearchMatch = searchMatches.includes(path);
  const keyMatchesSearch = searchQuery && keyName !== null && String(keyName).toLowerCase().includes(searchQuery.toLowerCase());
  const valueMatchesSearch = searchQuery && !isExpandable && String(value).toLowerCase().includes(searchQuery.toLowerCase());

  const handleToggle = useCallback(() => togglePath(path), [togglePath, path]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  }, []);

  // ── Tooltip state ──
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleRowMouseEnter = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setHovered(true);
  }, []);

  const handleRowMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleRowMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  const indent = depth * 20;

  return (
    <div className={`animate-fade-in ${isSearchMatch ? 'bg-accent/20 rounded' : ''}`}>
      <div
        className="group flex items-center gap-1 py-0.5 px-2 hover:bg-muted/50 rounded-sm cursor-default text-sm"
        style={{ paddingLeft: `${indent + 8}px` }}
        onMouseEnter={handleRowMouseEnter}
        onMouseMove={handleRowMouseMove}
        onMouseLeave={handleRowMouseLeave}
      >
        {/* Expand/collapse toggle */}
        {isExpandable ? (
          <button onClick={handleToggle} className="p-0.5 rounded hover:bg-muted transition-transform duration-200">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        ) : (
          <span className="w-[18px]" />
        )}

        {/* Key name */}
        {keyName !== null && (
          <>
            <span className={`json-key font-mono ${keyMatchesSearch ? 'bg-accent/40 rounded px-0.5' : ''}`}>
              {typeof keyName === 'number' ? keyName : `"${keyName}"`}
            </span>
            <span className="text-muted-foreground font-mono">:</span>
          </>
        )}

        {/* Value or summary */}
        {isExpandable ? (
          <button onClick={handleToggle} className="flex items-center gap-1.5">
            <span className="json-bracket font-mono">{type === 'array' ? '[' : '{'}</span>
            {!isExpanded && (
              <>
                <span className="text-muted-foreground text-xs">{count} items</span>
                <span className="json-bracket font-mono">{type === 'array' ? ']' : '}'}</span>
              </>
            )}
          </button>
        ) : (
          <span className={valueMatchesSearch ? 'bg-accent/40 rounded px-0.5' : ''}>
            <ValueDisplay value={value} />
          </span>
        )}

        {!isLast && !isExpandable && <span className="text-muted-foreground font-mono">,</span>}

        {/* Type badge */}
        <span className={`ml-2 px-1.5 py-0 text-[10px] rounded-full font-medium opacity-0 group-hover:opacity-100 transition-opacity ${TYPE_BADGES[type] || ''}`}>
          {type}
        </span>

        {/* Copy path button */}
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => copyToClipboard(path, 'path')}
            title="Copy JSON path"
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Path tooltip */}
      {hovered && <PathTooltip path={path} type={type} mousePos={mousePos} />}

      {/* Children */}
      {isExpandable && isExpanded && (
        <div>
          {type === 'array'
            ? (value as unknown[]).map((item, i) => (
                <JsonNode key={i} keyName={i} value={item} path={`${path}[${i}]`} depth={depth + 1} isLast={i === (value as unknown[]).length - 1} />
              ))
            : Object.entries(value as Record<string, unknown>).map(([k, v], i, arr) => (
                <JsonNode key={k} keyName={k} value={v} path={`${path}.${k}`} depth={depth + 1} isLast={i === arr.length - 1} />
              ))}
          <div className="text-sm font-mono text-muted-foreground py-0.5 px-2" style={{ paddingLeft: `${indent + 8}px` }}>
            {type === 'array' ? ']' : '}'}
            {!isLast && ','}
          </div>
        </div>
      )}
    </div>
  );
});

export default JsonNode;
