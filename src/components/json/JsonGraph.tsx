import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { useJsonStore } from "@/stores/jsonStore";
import { getJsonType } from "@/utils/jsonUtils";
import { Maximize2, ZoomIn, ZoomOut, RotateCcw, Network } from "lucide-react";

interface TreeNode {
  id: string;
  label: string;
  type: string;
  value: unknown;
  children: TreeNode[];
  x: number;
  y: number;
}

const NODE_H = 42;
const NODE_W = 168;
const LEVEL_W = 310;
const VERT_GAP = 14;

const TYPE_CFG: Record<
  string,
  {
    bg: string;
    border: string;
    accent: string;
    labelClr: string;
    valClr: string;
    typeClr: string;
  }
> = {
  object: {
    bg: "rgba(99,102,241,0.07)",
    border: "rgba(99,102,241,0.55)",
    accent: "#6366f1",
    labelClr: "#c7d2fe",
    valClr: "#818cf8",
    typeClr: "#a5b4fc",
  },
  array: {
    bg: "rgba(59,130,246,0.07)",
    border: "rgba(59,130,246,0.55)",
    accent: "#3b82f6",
    labelClr: "#bfdbfe",
    valClr: "#60a5fa",
    typeClr: "#93c5fd",
  },
  string: {
    bg: "rgba(16,185,129,0.07)",
    border: "rgba(16,185,129,0.5)",
    accent: "#10b981",
    labelClr: "#a7f3d0",
    valClr: "#6ee7b7",
    typeClr: "#34d399",
  },
  number: {
    bg: "rgba(245,158,11,0.07)",
    border: "rgba(245,158,11,0.5)",
    accent: "#f59e0b",
    labelClr: "#fef08a",
    valClr: "#fcd34d",
    typeClr: "#fbbf24",
  },
  boolean: {
    bg: "rgba(249,115,22,0.07)",
    border: "rgba(249,115,22,0.5)",
    accent: "#f97316",
    labelClr: "#fed7aa",
    valClr: "#fb923c",
    typeClr: "#fdba74",
  },
  null: {
    bg: "rgba(107,114,128,0.07)",
    border: "rgba(107,114,128,0.45)",
    accent: "#6b7280",
    labelClr: "#d1d5db",
    valClr: "#9ca3af",
    typeClr: "#9ca3af",
  },
};

function shortValue(value: unknown, type: string): string {
  if (type === "null") return "null";
  if (type === "boolean") return String(value);
  if (type === "number") return String(value);
  if (type === "string") {
    const s = value as string;
    if (s.length === 0) return '""';
    return s.length > 17 ? `"${s.slice(0, 15)}…"` : `"${s}"`;
  }
  return "";
}

function jsonToTree(
  v: unknown,
  label: string,
  path: string,
  maxD = 10,
  d = 0,
): TreeNode {
  const type = getJsonType(v);
  const node: TreeNode = {
    id: path,
    label,
    type,
    value: v,
    children: [],
    x: 0,
    y: 0,
  };
  if (d >= maxD) return node;
  if (type === "object" && v !== null) {
    node.children = Object.entries(v as Record<string, unknown>).map(
      ([k, val]) => jsonToTree(val, k, `${path}.${k}`, maxD, d + 1),
    );
  } else if (type === "array") {
    const arr = v as unknown[];
    node.children = arr
      .slice(0, 20)
      .map((val, i) => jsonToTree(val, `[${i}]`, `${path}[${i}]`, maxD, d + 1));
  }
  return node;
}

function layoutTree(
  node: TreeNode,
  depth: number,
  counter: { y: number },
): void {
  node.x = depth * LEVEL_W;
  if (node.children.length === 0) {
    node.y = counter.y + NODE_H / 2;
    counter.y += NODE_H + VERT_GAP;
    return;
  }
  for (const child of node.children) layoutTree(child, depth + 1, counter);
  node.y = (node.children[0].y + node.children[node.children.length - 1].y) / 2;
}

function collectAll(node: TreeNode): {
  nodes: TreeNode[];
  edges: { from: TreeNode; to: TreeNode }[];
} {
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

export default function JsonGraph() {
  const { parsedJson } = useJsonStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 60, y: 60, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const transformRef = useRef(transform);
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { nodes, edges, totalH, totalW } = useMemo(() => {
    if (!parsedJson) return { nodes: [], edges: [], totalH: 0, totalW: 0 };
    const root = jsonToTree(parsedJson, "root", "$");
    const counter = { y: 0 };
    layoutTree(root, 0, counter);
    const { nodes, edges } = collectAll(root);
    const maxX = nodes.length ? Math.max(...nodes.map((n) => n.x)) : 0;
    return { nodes, edges, totalH: counter.y, totalW: maxX + NODE_W };
  }, [parsedJson]);

  const stats = useMemo(() => {
    if (!nodes.length) return null;
    const types: Record<string, number> = {};
    nodes.forEach((n) => {
      types[n.type] = (types[n.type] || 0) + 1;
    });
    const maxDepth = nodes.length
      ? Math.round(Math.max(...nodes.map((n) => n.x)) / LEVEL_W)
      : 0;
    return { total: nodes.length, edges: edges.length, maxDepth, types };
  }, [nodes, edges]);

  // Keep a ref in sync so the wheel handler (registered once) can read latest transform
  useEffect(() => {
    transformRef.current = transform;
  });

  // Non-passive wheel listener so we can call preventDefault and stop page scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const t = transformRef.current;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const newScale = Math.min(3, Math.max(0.1, t.scale * factor));
      // Zoom toward the cursor: keep the graph point under the mouse fixed
      const graphX = (mouseX - t.x) / t.scale;
      const graphY = (mouseY - t.y) / t.scale;
      setTransform({
        x: mouseX - graphX * newScale,
        y: mouseY - graphY * newScale,
        scale: newScale,
      });
      // Mark as zooming for CSS transition, then clear after animation settles
      setIsZooming(true);
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = setTimeout(() => setIsZooming(false), 150);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      setIsZooming(false);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: transform.x,
        ty: transform.y,
      };
    },
    [transform],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setTransform((t) => ({
        ...t,
        x: panStart.current.tx + (e.clientX - panStart.current.x),
        y: panStart.current.ty + (e.clientY - panStart.current.y),
      }));
    },
    [isPanning],
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const fitView = useCallback(() => {
    if (!containerRef.current || totalW === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const sx = (rect.width - 120) / (totalW + 200);
    const sy = (rect.height - 120) / (totalH + 60);
    const scale = Math.min(sx, sy, 1.5);
    setTransform({ x: 60, y: 60, scale: Math.max(0.1, scale) });
  }, [totalW, totalH]);

  useEffect(() => {
    if (nodes.length > 0) fitView();
  }, [nodes.length]);

  if (!parsedJson) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-5"
        style={{
          background: "linear-gradient(135deg, #060d1f 0%, #0f172a 100%)",
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.3)",
          }}
        >
          <Network className="w-8 h-8" style={{ color: "#818cf8" }} />
        </div>
        <div className="text-center space-y-1">
          <p
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "15px",
              fontWeight: 500,
            }}
          >
            No JSON loaded
          </p>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
            Load JSON in the Viewer tab to visualize the graph
          </p>
        </div>
        <div
          className="flex items-center gap-4 px-5 py-2.5 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {Object.entries(TYPE_CFG).map(([type, cfg]) => (
            <span key={type} className="flex items-center gap-1.5">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: cfg.accent,
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                {type}
              </span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col h-full select-none"
      style={{
        background:
          "linear-gradient(160deg, #060d1f 0%, #0d1327 55%, #0a1020 100%)",
      }}
    >
      {/* Dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(99,102,241,0.25) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          opacity: 0.35,
        }}
      />

      {/* Ambient glow blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-10%",
          left: "-5%",
          width: "40%",
          height: "40%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "-10%",
          right: "-5%",
          width: "35%",
          height: "35%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />

      {/* Controls — top left */}
      <div
        className="absolute top-3 left-3 z-20 flex items-center gap-0.5 rounded-xl p-1"
        style={{
          background: "rgba(10,16,36,0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
        }}
      >
        {[
          {
            icon: ZoomIn,
            title: "Zoom in",
            action: () =>
              setTransform((t) => ({
                ...t,
                scale: Math.min(3, t.scale * 1.2),
              })),
          },
          {
            icon: ZoomOut,
            title: "Zoom out",
            action: () =>
              setTransform((t) => ({
                ...t,
                scale: Math.max(0.1, t.scale / 1.2),
              })),
          },
          { icon: Maximize2, title: "Fit view", action: fitView },
          {
            icon: RotateCcw,
            title: "Reset view",
            action: () => setTransform({ x: 60, y: 60, scale: 1 }),
          },
        ].map(({ icon: Icon, title, action }) => (
          <button
            key={title}
            onClick={() => {
              setIsZooming(true);
              action();
              if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
              zoomTimerRef.current = setTimeout(() => setIsZooming(false), 200);
            }}
            title={title}
            className="p-2 rounded-lg transition-all duration-150"
            style={{ color: "rgba(255,255,255,0.55)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.09)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "rgba(255,255,255,0.9)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
              (e.currentTarget as HTMLButtonElement).style.color =
                "rgba(255,255,255,0.55)";
            }}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
        <div
          style={{
            width: 1,
            height: 20,
            background: "rgba(255,255,255,0.1)",
            margin: "0 4px",
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.38)",
            paddingRight: 8,
            fontFamily: "monospace",
            minWidth: 38,
            textAlign: "center",
          }}
        >
          {Math.round(transform.scale * 100)}%
        </span>
      </div>

      {/* Stats panel — top right */}
      {stats && (
        <div
          className="absolute top-3 right-3 z-20 rounded-xl p-3"
          style={{
            background: "rgba(10,16,36,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            minWidth: 152,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.35)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 600,
            }}
          >
            Graph Stats
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              { label: "Nodes", value: stats.total },
              { label: "Edges", value: stats.edges },
              { label: "Max depth", value: stats.maxDepth },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.42)" }}>
                  {label}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.82)",
                    fontFamily: "monospace",
                    fontWeight: 600,
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.07)",
                margin: "2px 0",
              }}
            />
            {Object.entries(stats.types).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 2,
                      background: TYPE_CFG[type]?.accent || "#6b7280",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}
                  >
                    {type}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: "monospace",
                  }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend — bottom left */}
      <div
        className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl px-4 py-2.5"
        style={{
          background: "rgba(10,16,36,0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
          maxWidth: 360,
        }}
      >
        {Object.entries(TYPE_CFG).map(([type, cfg]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: cfg.accent,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.42)" }}>
              {type}
            </span>
          </span>
        ))}
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.2)",
            marginLeft: 4,
          }}
        >
          · Scroll to zoom · Drag to pan
        </span>
      </div>

      {/* SVG canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg width="100%" height="100%" className="select-none">
          <defs>
            <filter id="glow-sm" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="2.5"
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-md" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="4"
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: "0 0",
              transition: isZooming
                ? "transform 0.12s cubic-bezier(0.16,1,0.3,1)"
                : "none",
            }}
          >
            {/* Edges */}
            {edges.map((edge, i) => {
              const x1 = edge.from.x + NODE_W;
              const y1 = edge.from.y;
              const x2 = edge.to.x;
              const y2 = edge.to.y;
              const cp = x1 + (x2 - x1) * 0.5;
              const cfg = TYPE_CFG[edge.from.type] || TYPE_CFG.null;
              const isHov =
                hoveredId === edge.from.id || hoveredId === edge.to.id;
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} C ${cp} ${y1}, ${cp} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={cfg.border}
                  strokeWidth={isHov ? 2 : 1.5}
                  opacity={isHov ? 0.7 : 0.3}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const cfg = TYPE_CFG[node.type] || TYPE_CFG.null;
              const hasChildren = node.children.length > 0;
              const isHov = hoveredId === node.id;
              const childLabel = hasChildren
                ? node.type === "array"
                  ? `[${node.children.length}]`
                  : `{${node.children.length}}`
                : null;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y - NODE_H / 2})`}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: "default" }}
                  filter={isHov ? "url(#glow-sm)" : undefined}
                >
                  {/* Outer glow ring on hover */}
                  {isHov && (
                    <rect
                      x={-3}
                      y={-3}
                      width={NODE_W + 6}
                      height={NODE_H + 6}
                      rx={11}
                      fill="none"
                      stroke={cfg.accent}
                      strokeWidth={1}
                      opacity={0.35}
                    />
                  )}

                  {/* Main card */}
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    fill={cfg.bg}
                    stroke={cfg.border}
                    strokeWidth={isHov ? 1.5 : 1}
                    strokeOpacity={isHov ? 1 : 0.7}
                  />

                  {/* Left accent bar */}
                  <rect
                    x={0}
                    y={4}
                    width={3}
                    height={NODE_H - 8}
                    rx={2}
                    fill={cfg.accent}
                    opacity={0.9}
                  />

                  {/* Key / label */}
                  <text
                    x={13}
                    y={16}
                    fill={cfg.labelClr}
                    fontSize={11.5}
                    fontWeight={600}
                    fontFamily="'Inter', system-ui, sans-serif"
                  >
                    {node.label.length > 16
                      ? node.label.slice(0, 15) + "…"
                      : node.label}
                  </text>

                  {/* Value preview or child count */}
                  <text
                    x={13}
                    y={31}
                    fill={cfg.valClr}
                    fontSize={10}
                    fontFamily={
                      hasChildren
                        ? "'Inter', system-ui"
                        : "'JetBrains Mono', monospace"
                    }
                    opacity={0.85}
                  >
                    {hasChildren
                      ? childLabel
                      : shortValue(node.value, node.type)}
                  </text>

                  {/* Type tag — top right */}
                  <text
                    x={NODE_W - 9}
                    y={16}
                    fill={cfg.typeClr}
                    fontSize={9}
                    textAnchor="end"
                    fontFamily="'Inter', system-ui"
                    opacity={0.6}
                  >
                    {node.type}
                  </text>

                  {/* Connection dot — right center */}
                  <circle
                    cx={NODE_W}
                    cy={NODE_H / 2}
                    r={hasChildren ? 3.5 : 2.5}
                    fill={cfg.accent}
                    opacity={hasChildren ? 0.8 : 0.4}
                    filter={hasChildren && isHov ? "url(#glow-md)" : undefined}
                  />

                  {/* Connection dot — left center */}
                  <circle
                    cx={0}
                    cy={NODE_H / 2}
                    r={2}
                    fill={cfg.accent}
                    opacity={0.35}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
