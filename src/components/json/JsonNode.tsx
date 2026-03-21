import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Copy, ChevronDown } from 'lucide-react';
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

function ValueDisplay({ value }: { value: unknown }) {
  const type = getJsonType(value);

  if (type === 'string') {
    return <span className="json-string font-mono">"{String(value)}"</span>;
  }
  if (type === 'number') {
    return <span className="json-number font-mono">{String(value)}</span>;
  }
  if (type === 'boolean') {
    return <span className="json-boolean font-mono">{String(value)}</span>;
  }
  if (type === 'null') {
    return <span className="json-null font-mono">null</span>;
  }
  return null;
}

// ─── Path Tooltip (portal-rendered, fixed position) ─────────────────────────
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
  const [copied, setCopied] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: mousePos.x, y: mousePos.y });

  // On mount, clamp within viewport
  useEffect(() => {
    const TOOLTIP_W = 340;
    const TOOLTIP_H = 88;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rawX = mousePos.x + 14;
    const rawY = mousePos.y + 16;
    setPos({
      x: rawX + TOOLTIP_W > vw ? mousePos.x - TOOLTIP_W - 10 : rawX,
      y: rawY + TOOLTIP_H > vh ? mousePos.y - TOOLTIP_H - 10 : rawY,
    });
  }, [mousePos.x, mousePos.y]);

  const handleCopy = () => {
    navigator.clipboard.writeText(path).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return createPortal(
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 340,
        zIndex: 9999,
        borderRadius: 12,
        background: 'rgba(6,9,24,0.97)',
        border: `1.5px solid ${cfg.border}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 16px ${cfg.bg}`,
        backdropFilter: 'blur(18px)',
        padding: '10px 12px',
        pointerEvents: 'none',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: cfg.accent }}>
          JSON Path
        </span>
        <span style={{ fontSize: 9, fontWeight: 600, padding: '1.5px 7px', borderRadius: 5, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}>
          {type}
        </span>
      </div>
      {/* Path row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '6px 10px', border: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ flex: 1, fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 12, color: cfg.text === '#cbd5e1' ? 'rgba(255,255,255,0.7)' : cfg.text, wordBreak: 'break-all', lineHeight: 1.5 }}>
          {path}
        </span>
        <button
          onMouseDown={(e) => { e.preventDefault(); handleCopy(); }}
          style={{ flexShrink: 0, pointerEvents: 'auto', background: copied ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.07)', border: `1px solid ${copied ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 5, color: copied ? '#34d399' : 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '2px 8px', fontSize: 9.5, fontWeight: 600, transition: 'all 0.2s' }}
        >
          {copied ? '✓' : 'Copy'}
        </button>
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
  const rowRef = useRef<HTMLDivElement>(null);

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
        ref={rowRef}
        className="group flex items-center gap-1 py-0.5 px-2 hover:bg-muted/50 rounded-sm cursor-default text-sm"
        style={{ paddingLeft: `${indent + 8}px` }}
        onMouseEnter={handleRowMouseEnter}
        onMouseMove={handleRowMouseMove}
        onMouseLeave={handleRowMouseLeave}
      >
        {/* Expand/collapse toggle */}
        {isExpandable ? (
          <button
            onClick={handleToggle}
            className="p-0.5 rounded hover:bg-muted transition-transform duration-200"
            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(0deg)' }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
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
            <span className="json-bracket font-mono">
              {type === 'array' ? '[' : '{'}
            </span>
            {!isExpanded && (
              <>
                <span className="text-muted-foreground text-xs">{count} items</span>
                <span className="json-bracket font-mono">
                  {type === 'array' ? ']' : '}'}
                </span>
              </>
            )}
          </button>
        ) : (
          <span className={valueMatchesSearch ? 'bg-accent/40 rounded px-0.5' : ''}>
            <ValueDisplay value={value} />
          </span>
        )}

        {!isLast && !isExpandable && (
          <span className="text-muted-foreground font-mono">,</span>
        )}

        {/* Type badge */}
        <span className={`ml-2 px-1.5 py-0 text-[10px] rounded-full font-medium opacity-0 group-hover:opacity-100 transition-opacity ${TYPE_BADGES[type] || ''}`}>
          {type}
        </span>

        {/* Copy buttons */}
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => copyToClipboard(path, 'path')}
            title="Copy path"
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
                <JsonNode
                  key={i}
                  keyName={i}
                  value={item}
                  path={`${path}[${i}]`}
                  depth={depth + 1}
                  isLast={i === (value as unknown[]).length - 1}
                />
              ))
            : Object.entries(value as Record<string, unknown>).map(([k, v], i, arr) => (
                <JsonNode
                  key={k}
                  keyName={k}
                  value={v}
                  path={`${path}.${k}`}
                  depth={depth + 1}
                  isLast={i === arr.length - 1}
                />
              ))}
          <div
            className="text-sm font-mono text-muted-foreground py-0.5 px-2"
            style={{ paddingLeft: `${indent + 8}px` }}
          >
            {type === 'array' ? ']' : '}'}
            {!isLast && ','}
          </div>
        </div>
      )}
    </div>
  );
});

export default JsonNode;
