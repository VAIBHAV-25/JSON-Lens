import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { getJsonType } from '@/utils/jsonUtils';
import { Maximize2, ZoomIn, ZoomOut, RotateCcw, Network } from 'lucide-react';

interface TreeNode {
  id: string;
  label: string;
  type: string;
  value: unknown;
  children: TreeNode[];
  x: number;
  y: number;
}

// ─── Layout constants ────────────────────────────────────────────────────────
const NODE_W   = 228;
const NODE_H   = 56;
const LEVEL_W  = 380;
const VERT_GAP = 20;
const MAX_NODES = 250;

// ─── Type visual config ──────────────────────────────────────────────────────
const T: Record<string, { bg: string; border: string; accent: string; glow: string; label: string; val: string; tag: string }> = {
  object:  { bg: 'rgba(129,140,248,0.16)', border: 'rgba(129,140,248,0.9)',  accent: '#818cf8', glow: 'rgba(129,140,248,0.4)', label: '#e0e7ff', val: '#c7d2fe', tag: '#818cf8' },
  array:   { bg: 'rgba(56,189,248,0.14)',  border: 'rgba(56,189,248,0.9)',   accent: '#38bdf8', glow: 'rgba(56,189,248,0.35)', label: '#e0f2fe', val: '#7dd3fc', tag: '#38bdf8' },
  string:  { bg: 'rgba(52,211,153,0.14)',  border: 'rgba(52,211,153,0.85)',  accent: '#34d399', glow: 'rgba(52,211,153,0.35)', label: '#d1fae5', val: '#6ee7b7', tag: '#34d399' },
  number:  { bg: 'rgba(251,191,36,0.13)',  border: 'rgba(251,191,36,0.85)',  accent: '#fbbf24', glow: 'rgba(251,191,36,0.35)', label: '#fef9c3', val: '#fde68a', tag: '#fbbf24' },
  boolean: { bg: 'rgba(251,146,60,0.14)',  border: 'rgba(251,146,60,0.85)',  accent: '#fb923c', glow: 'rgba(251,146,60,0.35)', label: '#ffedd5', val: '#fed7aa', tag: '#fb923c' },
  null:    { bg: 'rgba(148,163,184,0.11)', border: 'rgba(148,163,184,0.75)', accent: '#94a3b8', glow: 'rgba(148,163,184,0.25)', label: '#f1f5f9', val: '#cbd5e1', tag: '#94a3b8' },
};

function shortVal(value: unknown, type: string): string {
  if (type === 'null') return 'null';
  if (type === 'boolean') return String(value);
  if (type === 'number') return String(value);
  if (type === 'string') {
    const s = value as string;
    if (s.length === 0) return '""';
    return s.length > 19 ? `"${s.slice(0, 17)}…"` : `"${s}"`;
  }
  return '';
}

function jsonToTree(v: unknown, label: string, path: string, maxD = 10, d = 0, count = { n: 0 }): TreeNode {
  const type = getJsonType(v);
  const node: TreeNode = { id: path, label, type, value: v, children: [], x: 0, y: 0 };
  count.n++;
  if (d >= maxD || count.n >= MAX_NODES) return node;
  if (type === 'object' && v !== null) {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (count.n >= MAX_NODES) break;
      node.children.push(jsonToTree(val, k, `${path}.${k}`, maxD, d + 1, count));
    }
  } else if (type === 'array') {
    const arr = v as unknown[];
    for (let i = 0; i < Math.min(arr.length, 15); i++) {
      if (count.n >= MAX_NODES) break;
      node.children.push(jsonToTree(arr[i], `[${i}]`, `${path}[${i}]`, maxD, d + 1, count));
    }
  }
  return node;
}

function layoutTree(node: TreeNode, depth: number, counter: { y: number }): void {
  node.x = depth * LEVEL_W;
  if (node.children.length === 0) {
    node.y = counter.y + NODE_H / 2;
    counter.y += NODE_H + VERT_GAP;
    return;
  }
  for (const child of node.children) layoutTree(child, depth + 1, counter);
  node.y = (node.children[0].y + node.children[node.children.length - 1].y) / 2;
}

function collectAll(node: TreeNode): { nodes: TreeNode[]; edges: { from: TreeNode; to: TreeNode }[] } {
  const nodes: TreeNode[] = [node];
  const edges: { from: TreeNode; to: TreeNode }[] = [];
  for (const child of node.children) {
    edges.push({ from: node, to: child });
    const sub = collectAll(child);
    nodes.push(...sub.nodes);
    edges.push(...sub.edges);
  }
  return { nodes, edges };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function JsonGraph() {
  const { parsedJson } = useJsonStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 60, y: 60, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedNode, setPinnedNode] = useState<TreeNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipHovered, setTooltipHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const lastHoveredNodeRef = useRef<TreeNode | null>(null);
  // Ref so the memoized mouse-move callback can read the latest value without re-creating
  const tooltipHoveredRef = useRef(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const transformRef = useRef(transform);
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { nodes, edges, totalH, totalW } = useMemo(() => {
    if (!parsedJson) return { nodes: [], edges: [], totalH: 0, totalW: 0 };
    const root = jsonToTree(parsedJson, 'root', '$');
    const counter = { y: 0 };
    layoutTree(root, 0, counter);
    const { nodes, edges } = collectAll(root);
    const maxX = nodes.length ? Math.max(...nodes.map(n => n.x)) : 0;
    return { nodes, edges, totalH: counter.y, totalW: maxX + NODE_W };
  }, [parsedJson]);

  const stats = useMemo(() => {
    if (!nodes.length) return null;
    const types: Record<string, number> = {};
    nodes.forEach(n => { types[n.type] = (types[n.type] || 0) + 1; });
    const maxDepth = Math.round(Math.max(...nodes.map(n => n.x)) / LEVEL_W);
    return { total: nodes.length, edges: edges.length, maxDepth, types };
  }, [nodes, edges]);

  useEffect(() => { transformRef.current = transform; });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const t = transformRef.current;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const newScale = Math.min(4, Math.max(0.15, t.scale * factor));
      const gx = (mx - t.x) / t.scale;
      const gy = (my - t.y) / t.scale;
      setTransform({ x: mx - gx * newScale, y: my - gy * newScale, scale: newScale });
      setIsZooming(true);
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = setTimeout(() => setIsZooming(false), 150);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setIsZooming(false);
    panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setTransform(t => ({
      ...t,
      x: panStart.current.tx + (e.clientX - panStart.current.x),
      y: panStart.current.ty + (e.clientY - panStart.current.y),
    }));
  }, [isPanning]);

  // Track cursor position for tooltip — skip updates while cursor is inside the tooltip
  const handleMouseMoveTooltip = useCallback((e: React.MouseEvent) => {
    if (isPanning || tooltipHoveredRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isPanning]);

  const handleCopyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(path).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }, []);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const fitView = useCallback(() => {
    if (!containerRef.current || totalW === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const sx = (rect.width - 140) / (totalW + 160);
    const sy = (rect.height - 140) / (totalH + 80);
    const scale = Math.min(sx, sy, 1.2);
    setTransform({ x: 70, y: 70, scale: Math.max(0.4, scale) });
  }, [totalW, totalH]);

  useEffect(() => { if (nodes.length > 0) fitView(); }, [nodes.length, fitView]);

  const zoomTo = useCallback((action: () => void) => {
    setIsZooming(true);
    action();
    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = setTimeout(() => setIsZooming(false), 220);
  }, []);

  // ─── Empty state ────────────────────────────────────────────────────────────
  if (!parsedJson) {
    return (
      <div className="relative flex flex-col items-center justify-center h-full gap-6 overflow-hidden" style={{ background: 'linear-gradient(145deg, #06091a 0%, #0c1128 60%, #08101e 100%)' }}>
        <div className="aurora-blob-1 absolute w-96 h-96 rounded-full pointer-events-none" style={{ top: '-10%', left: '10%', background: 'radial-gradient(circle, rgba(129,140,248,0.18) 0%, transparent 70%)' }} />
        <div className="aurora-blob-2 absolute w-80 h-80 rounded-full pointer-events-none" style={{ bottom: '0', right: '5%', background: 'radial-gradient(circle, rgba(56,189,248,0.14) 0%, transparent 70%)' }} />
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center relative" style={{ background: 'rgba(129,140,248,0.15)', border: '1.5px solid rgba(129,140,248,0.5)', boxShadow: '0 0 40px rgba(129,140,248,0.2)' }}>
          <Network className="w-10 h-10" style={{ color: '#818cf8' }} />
          <div className="absolute inset-0 rounded-3xl" style={{ background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
        </div>
        <div className="text-center space-y-2 z-10">
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '17px', fontWeight: 700 }}>Visualize your JSON</p>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13px' }}>Load JSON in the Viewer tab to see the node graph</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 z-10 px-6">
          {Object.entries(T).map(([type, cfg]) => (
            <span key={type} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: cfg.accent, display: 'inline-block', boxShadow: `0 0 6px ${cfg.glow}` }} />
              <span style={{ fontSize: 11, color: cfg.label, fontWeight: 500 }}>{type}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ─── Main graph ─────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-full select-none overflow-hidden" style={{ background: 'linear-gradient(145deg, #06091a 0%, #0c1128 60%, #08101e 100%)' }}>

      {/* Animated aurora blobs */}
      <div className="aurora-blob-1 absolute w-[55%] h-[55%] rounded-full pointer-events-none" style={{ top: '-15%', left: '-5%', background: 'radial-gradient(ellipse, rgba(129,140,248,0.12) 0%, transparent 65%)' }} />
      <div className="aurora-blob-2 absolute w-[45%] h-[45%] rounded-full pointer-events-none" style={{ bottom: '-10%', right: '-5%', background: 'radial-gradient(ellipse, rgba(56,189,248,0.10) 0%, transparent 65%)' }} />
      <div className="aurora-blob-3 absolute w-[30%] h-[30%] rounded-full pointer-events-none" style={{ top: '30%', right: '20%', background: 'radial-gradient(ellipse, rgba(52,211,153,0.07) 0%, transparent 70%)' }} />

      {/* Animated dot grid */}
      <div className="graph-grid absolute inset-0 pointer-events-none opacity-40" />

      {/* ── Controls ── */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1 rounded-2xl p-1.5" style={{ background: 'rgba(8,13,30,0.92)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        {[
          { icon: ZoomIn,    title: 'Zoom in',   action: () => setTransform(t => ({ ...t, scale: Math.min(4, t.scale * 1.25) })) },
          { icon: ZoomOut,   title: 'Zoom out',  action: () => setTransform(t => ({ ...t, scale: Math.max(0.15, t.scale / 1.25) })) },
          { icon: Maximize2, title: 'Fit view',  action: fitView },
          { icon: RotateCcw, title: 'Reset',     action: () => setTransform({ x: 60, y: 60, scale: 1 }) },
        ].map(({ icon: Icon, title, action }) => (
          <button
            key={title}
            onClick={() => zoomTo(action)}
            title={title}
            className="graph-ctrl-btn p-2.5 rounded-xl transition-all duration-150"
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
        <span className="pr-2 tabular-nums font-mono text-xs" style={{ color: 'rgba(255,255,255,0.5)', minWidth: 40, textAlign: 'center' }}>
          {Math.round(transform.scale * 100)}%
        </span>
      </div>

      {/* ── Stats panel ── */}
      {stats && (
        <div className="absolute top-4 right-4 z-20 rounded-2xl overflow-hidden" style={{ background: 'rgba(8,13,30,0.92)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', minWidth: 170 }}>
          <div className="px-4 py-2.5" style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.25), rgba(56,189,248,0.15))', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Graph Stats</span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2">
            {[
              { label: 'Nodes',     value: stats.total,    color: '#818cf8' },
              { label: 'Edges',     value: stats.edges,    color: '#38bdf8' },
              { label: 'Max depth', value: stats.maxDepth, color: '#34d399' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                <span style={{ fontSize: 18, color, fontFamily: 'monospace', fontWeight: 700, lineHeight: 1 }}>{value}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
            {Object.entries(stats.types).map(([type, count]) => {
              const cfg = T[type];
              const total = stats.total;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={type} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: cfg?.accent || '#6b7280', display: 'inline-block', boxShadow: `0 0 4px ${cfg?.glow || 'transparent'}` }} />
                      <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)' }}>{type}</span>
                    </span>
                    <span style={{ fontSize: 11, color: cfg?.label || '#fff', fontFamily: 'monospace', fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: cfg?.accent || '#6b7280', boxShadow: `0 0 6px ${cfg?.glow || 'transparent'}` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(8,13,30,0.92)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>
        {Object.entries(T).map(([type, cfg]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: cfg.accent, display: 'inline-block', boxShadow: `0 0 5px ${cfg.glow}` }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{type}</span>
          </span>
        ))}
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}>· Scroll zoom · Drag pan · Hover/click path</span>
      </div>

      {/* ── SVG Canvas ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ cursor: isPanning ? 'grabbing' : 'grab', position: 'relative' }}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => { handleMouseMove(e); handleMouseMoveTooltip(e); }}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoveredId(null); }}
      >
        <svg width="100%" height="100%" className="select-none">
          <defs>
            {/* Per-type glow filters */}
            {Object.entries(T).map(([type]) => (
              <filter key={type} id={`glow-${type}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
            <filter id="glow-hover" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <g
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
              transition: isZooming ? 'transform 0.13s cubic-bezier(0.16,1,0.3,1)' : 'none',
            }}
          >
            {/* ── Edges ── */}
            {edges.map((edge, i) => {
              const x1 = edge.from.x + NODE_W;
              const y1 = edge.from.y;
              const x2 = edge.to.x;
              const y2 = edge.to.y;
              const cp = x1 + (x2 - x1) * 0.5;
              const cfg = T[edge.from.type] || T.null;
              const isHov = hoveredId === edge.from.id || hoveredId === edge.to.id;
              return (
                <g key={i}>
                  {/* Shadow path for depth */}
                  <path
                    d={`M ${x1} ${y1} C ${cp} ${y1}, ${cp} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={cfg.accent}
                    strokeWidth={isHov ? 5 : 3}
                    opacity={0.07}
                  />
                  {/* Animated flow path */}
                  <path
                    d={`M ${x1} ${y1} C ${cp} ${y1}, ${cp} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={cfg.border}
                    strokeWidth={isHov ? 2.5 : 1.8}
                    opacity={isHov ? 0.95 : 0.65}
                    strokeDasharray="10 6"
                    className="graph-edge-flow"
                    style={{ animationDuration: `${1.5 + (i % 5) * 0.3}s` }}
                  />
                </g>
              );
            })}

            {/* ── Nodes ── */}
            {nodes.map((node, idx) => {
              const cfg = T[node.type] || T.null;
              const hasChildren = node.children.length > 0;
              const isHov = hoveredId === node.id;
              const isPinned = pinnedNode?.id === node.id;
              const childLabel = hasChildren
                ? node.type === 'array' ? `[${node.children.length} items]` : `{${node.children.length} keys}`
                : null;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y - NODE_H / 2})`}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinnedNode(prev => prev?.id === node.id ? null : node);
                  }}
                  className="graph-node-enter"
                  style={{ cursor: 'pointer', animationDelay: `${Math.min(idx * 8, 300)}ms` }}
                >
                  {/* Ambient glow around card */}
                  <rect
                    x={-4} y={-4}
                    width={NODE_W + 8} height={NODE_H + 8}
                    rx={14}
                    fill={cfg.accent}
                    opacity={isHov ? 0.14 : 0.05}
                    filter={`url(#glow-${node.type})`}
                  />

                  {/* Hover / pinned ring */}
                  {(isHov || isPinned) && (
                    <rect x={-2} y={-2} width={NODE_W + 4} height={NODE_H + 4} rx={12}
                      fill="none" stroke={cfg.accent} strokeWidth={isPinned ? 2 : 1.5} opacity={isPinned ? 1 : 0.7}
                      filter="url(#glow-hover)"
                    />
                  )}

                  {/* Card background */}
                  <rect
                    width={NODE_W} height={NODE_H} rx={10}
                    fill={isHov ? cfg.bg.replace(/[\d.]+\)$/, '0.28)') : cfg.bg}
                    stroke={cfg.border}
                    strokeWidth={isHov ? 1.8 : 1.2}
                  />

                  {/* Glassy highlight */}
                  <rect x={2} y={2} width={NODE_W - 4} height={NODE_H / 2 - 2} rx={8}
                    fill="rgba(255,255,255,0.04)" />

                  {/* Left accent bar */}
                  <rect x={0} y={6} width={4} height={NODE_H - 12} rx={2}
                    fill={cfg.accent}
                    opacity={0.95}
                    filter={`url(#glow-${node.type})`}
                  />

                  {/* Key label */}
                  <text
                    x={15} y={22}
                    fill={cfg.label}
                    fontSize={13.5}
                    fontWeight={700}
                    fontFamily="'Inter', system-ui, sans-serif"
                  >
                    {node.label.length > 18 ? node.label.slice(0, 17) + '…' : node.label}
                  </text>

                  {/* Value or child summary */}
                  <text
                    x={15} y={40}
                    fill={cfg.val}
                    fontSize={11.5}
                    fontFamily={hasChildren ? "'Inter', system-ui" : "'JetBrains Mono', monospace"}
                    opacity={0.9}
                  >
                    {hasChildren ? childLabel : shortVal(node.value, node.type)}
                  </text>

                  {/* Type badge — top right */}
                  <text
                    x={NODE_W - 10} y={20}
                    fill={cfg.tag}
                    fontSize={10}
                    textAnchor="end"
                    fontFamily="'Inter', system-ui"
                    fontWeight={600}
                    opacity={0.75}
                  >
                    {node.type}
                  </text>

                  {/* Right connector dot */}
                  <circle
                    cx={NODE_W} cy={NODE_H / 2}
                    r={hasChildren ? 5 : 3.5}
                    fill={cfg.accent}
                    opacity={hasChildren ? 1 : 0.5}
                    filter={`url(#glow-${node.type})`}
                  />

                  {/* Left connector dot */}
                  <circle
                    cx={0} cy={NODE_H / 2}
                    r={3}
                    fill={cfg.accent}
                    opacity={0.5}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── JSON Path Tooltip ── */}
        {(() => {
          // Update ref whenever we have a real hovered node
          const hoveredNode = hoveredId ? nodes.find(n => n.id === hoveredId) : null;
          if (hoveredNode) lastHoveredNodeRef.current = hoveredNode;
          // Show tooltip if: pinned OR hovering a node OR cursor is inside the tooltip
          const activeNode = pinnedNode ?? (tooltipHovered ? lastHoveredNodeRef.current : hoveredNode);
          if (!activeNode) return null;
          const cfg = T[activeNode.type] || T.null;
          const valPreview = activeNode.children.length > 0
            ? activeNode.type === 'array' ? `[${activeNode.children.length} items]` : `{${activeNode.children.length} keys}`
            : shortVal(activeNode.value, activeNode.type);
          // Smart placement: keep tooltip within viewport
          const TOOLTIP_W = 320;
          const TOOLTIP_H = 110;
          const containerW = containerRef.current?.clientWidth ?? 800;
          const containerH = containerRef.current?.clientHeight ?? 600;
          const rawX = tooltipPos.x + 18;
          const rawY = tooltipPos.y + 18;
          const tx = rawX + TOOLTIP_W > containerW ? tooltipPos.x - TOOLTIP_W - 12 : rawX;
          const ty = rawY + TOOLTIP_H > containerH ? tooltipPos.y - TOOLTIP_H - 12 : rawY;
          return (
            <div
              onMouseEnter={() => { tooltipHoveredRef.current = true; setTooltipHovered(true); }}
              onMouseLeave={() => { tooltipHoveredRef.current = false; setTooltipHovered(false); }}
              style={{
                position: 'absolute',
                left: tx,
                top: ty,
                width: TOOLTIP_W,
                pointerEvents: 'auto',
                zIndex: 50,
                borderRadius: 14,
                background: 'rgba(6,9,24,0.97)',
                border: `1.5px solid ${cfg.border}`,
                boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 20px ${cfg.glow}`,
                backdropFilter: 'blur(20px)',
                padding: '12px 14px',
                fontSize: 12,
                transition: (pinnedNode || tooltipHovered) ? 'none' : 'left 0.06s, top 0.06s',
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: cfg.accent }}>
                  JSON Path
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.tag }}>
                    {activeNode.type}
                  </span>
                  {pinnedNode && (
                    <button
                      onClick={() => setPinnedNode(null)}
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 10, padding: '2px 7px' }}
                    >
                      ✕ close
                    </button>
                  )}
                </div>
              </div>
              {/* Path pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '7px 10px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
                <span style={{ flex: 1, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12, color: cfg.label, wordBreak: 'break-all', lineHeight: 1.5 }}>
                  {activeNode.id}
                </span>
                <button
                  onClick={() => handleCopyPath(activeNode.id)}
                  style={{ flexShrink: 0, background: copied ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.07)', border: `1px solid ${copied ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 6, color: copied ? '#34d399' : 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: '3px 8px', fontSize: 10, fontWeight: 600, transition: 'all 0.2s' }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              {/* Value row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>value</span>
                <span style={{ fontFamily: activeNode.children.length ? "'Inter', sans-serif" : "'JetBrains Mono', monospace", fontSize: 11, color: cfg.val, opacity: 0.85 }}>
                  {valPreview}
                </span>
                {pinnedNode && (
                  <span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', flexShrink: 0 }}>pinned</span>
                )}
              </div>
              {!pinnedNode && (
                <div style={{ marginTop: 6, fontSize: 9.5, color: 'rgba(255,255,255,0.22)', fontStyle: 'italic' }}>Click node to pin</div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
