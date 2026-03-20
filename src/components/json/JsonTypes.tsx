import { useMemo, useState } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { getJsonType } from '@/utils/jsonUtils';
import { Code2, Copy, Download, CheckCircle2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function toPascalCase(s: string): string {
  return (
    s.replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
     .replace(/^(.)/, (c: string) => c.toUpperCase())
     .replace(/[^a-zA-Z0-9]/g, '') || 'Unknown'
  );
}

function safePropKey(key: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
}

interface InferCtx {
  defs: Map<string, string>;
  used: Set<string>;
}

function inferType(value: unknown, name: string, ctx: InferCtx): string {
  const t = getJsonType(value);
  if (t === 'null') return 'null';
  if (t === 'boolean') return 'boolean';
  if (t === 'number') return 'number';
  if (t === 'string') {
    const s = value as string;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return 'string; // ISO date-time';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'string; // date';
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(s)) return 'string; // email';
    if (/^https?:\/\//.test(s)) return 'string; // URL';
    return 'string';
  }
  if (t === 'array') {
    const arr = value as unknown[];
    if (arr.length === 0) return 'unknown[]';
    const singular = name.endsWith('ies')
      ? name.slice(0, -3) + 'y'
      : name.endsWith('s') ? name.slice(0, -1) : name + 'Item';
    const seen = new Set<string>();
    for (const item of arr.slice(0, 20)) {
      const raw = inferType(item, singular, ctx);
      seen.add(raw.split(';')[0].trim());
    }
    const types = [...seen];
    const inner = types.length === 1 ? types[0] : `(${types.join(' | ')})`;
    return `${inner}[]`;
  }
  if (t === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    let iName = toPascalCase(name);
    if (!iName) iName = 'Unknown';
    let attempt = iName;
    let n = 2;
    while (ctx.used.has(attempt) && ctx.defs.get(attempt) !== '') {
      attempt = `${iName}${n++}`;
    }
    iName = attempt;
    if (ctx.defs.has(iName) && ctx.defs.get(iName) !== '') return iName;
    ctx.used.add(iName);
    ctx.defs.set(iName, '');
    const lines: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
      const propType = inferType(val, key, ctx);
      const isNullable = val === null;
      const prop = safePropKey(key);
      const hasComment = propType.includes(';');
      if (hasComment) {
        lines.push(`  ${prop}${isNullable ? '?' : ''}: ${propType}`);
      } else {
        lines.push(`  ${prop}${isNullable ? '?' : ''}: ${propType};`);
      }
    }
    ctx.defs.set(iName, `export interface ${iName} {\n${lines.join('\n')}\n}`);
    return iName;
  }
  return 'unknown';
}

function generateTypeScript(json: unknown): string {
  const ctx: InferCtx = { defs: new Map(), used: new Set() };
  inferType(json, 'Root', ctx);
  return [...ctx.defs.values()].filter(Boolean).join('\n\n');
}

function highlightTs(raw: string): string {
  return raw
    .split('\n')
    .map((line) => {
      const esc = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const iface = esc.match(/^(export interface )(\w+)( \{)$/);
      if (iface) {
        return `<span class="ts-kw">${iface[1]}</span><span class="ts-name">${iface[2]}</span><span class="ts-bracket">${iface[3]}</span>`;
      }
      if (/^\}/.test(esc)) return `<span class="ts-bracket">${esc}</span>`;

      const prop = esc.match(/^(  )("?[a-zA-Z_$][a-zA-Z0-9_$"]*\??)(:  ?)(.*?)(?:(; \/\/.*))?$/);
      if (prop) {
        const [, indent, pname, colon, typeExpr, cmnt] = prop;
        const typePart = typeExpr
          .replace(/\b(string|number|boolean|null|undefined|unknown|never|any)\b/g,
            '<span class="ts-builtin">$1</span>')
          .replace(/(\[\])/g, '<span class="ts-bracket">$1</span>')
          .replace(/([|()\[\]])/g, '<span class="ts-bracket">$1</span>')
          .replace(/\b([A-Z][a-zA-Z0-9]*)\b/g, '<span class="ts-ref">$1</span>');
        const comment = cmnt ? `<span class="ts-comment">${cmnt}</span>` : ';';
        return `${indent}<span class="ts-prop">${pname}</span>${colon}${typePart}${comment}`;
      }
      return esc;
    })
    .join('\n');
}

function countInterfaces(code: string): number {
  return (code.match(/^export interface /gm) || []).length;
}

export default function JsonTypes() {
  const { parsedJson } = useJsonStore();
  const [view, setView] = useState<'code' | 'info'>('code');

  const output = useMemo(() => (parsedJson ? generateTypeScript(parsedJson) : ''), [parsedJson]);
  const highlighted = useMemo(() => (output ? highlightTs(output) : ''), [output]);
  const ifaceCount = useMemo(() => countInterfaces(output), [output]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    toast.success('TypeScript types copied!');
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'types.d.ts';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded types.d.ts');
  };

  if (!parsedJson) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Code2 className="w-7 h-7 text-indigo-400 opacity-70" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">No JSON loaded</p>
          <p className="text-xs text-muted-foreground/60">Load JSON in the Viewer tab to generate TypeScript types</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b surface-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold">TypeScript Types</span>
        </div>
        <div className="flex items-center gap-3 ml-2">
          <span className="text-[11px] text-muted-foreground">
            <span className="font-mono font-semibold text-indigo-400">{ifaceCount}</span> interfaces
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60 border border-border/40">
          {(['code', 'info'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                view === v ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v === 'code' ? 'Code' : 'Summary'}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs h-7">
          <Copy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Copy</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-1.5 text-xs h-7">
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">.d.ts</span>
        </Button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        {view === 'code' ? (
          <div className="p-4">
            <div className="relative group rounded-xl overflow-hidden border border-border/40 bg-muted/20">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">types.d.ts</span>
                <button
                  onClick={handleCopy}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-0.5 rounded-md bg-card border text-[10px] text-muted-foreground hover:text-foreground"
                >
                  <Copy className="w-2.5 h-2.5" />
                  Copy
                </button>
              </div>
              <pre
                className="font-mono text-[12.5px] leading-relaxed p-4 overflow-auto ts-code-block"
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            </div>
          </div>
        ) : (
          <SummaryView output={output} />
        )}
      </div>
    </div>
  );
}

function SummaryView({ output }: { output: string }) {
  const interfaces = useMemo(() => {
    const matches = [...output.matchAll(/export interface (\w+) \{([^}]*)\}/g)];
    return matches.map((m) => {
      const name = m[1];
      const body = m[2];
      const props = body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && l !== '{' && l !== '}')
        .map((line) => {
          const match = line.match(/^("?[^"?:]+\??)"?:\s*(.+?);?(?:\s*\/\/\s*(.*))?$/);
          if (!match) return null;
          return { key: match[1].replace(/[?"]/g, ''), type: match[2].trim(), comment: match[3] };
        })
        .filter(Boolean) as { key: string; type: string; comment?: string }[];
      return { name, props };
    });
  }, [output]);

  const TYPE_COLOR: Record<string, string> = {
    string: 'text-emerald-500',
    number: 'text-amber-500',
    boolean: 'text-orange-500',
    null: 'text-slate-400',
    unknown: 'text-slate-400',
  };

  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {interfaces.map(({ name, props }) => (
        <div key={name} className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="px-3 py-2 border-b border-border/30 bg-indigo-500/5 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400">{name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{props.length} fields</span>
          </div>
          <div className="p-2 space-y-0.5">
            {props.map(({ key, type, comment }) => {
              const baseType = type.split('[')[0].split('(')[0].split(' ')[0];
              const color = TYPE_COLOR[baseType] || 'text-indigo-400';
              return (
                <div key={key} className="flex items-baseline gap-2 px-1 py-0.5 rounded hover:bg-muted/40 transition-colors">
                  <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">{key}</span>
                  <span className={`text-[10px] font-mono ml-auto ${color} flex-shrink-0`}>{type}</span>
                  {comment && <span className="text-[10px] text-muted-foreground/50 hidden lg:block">// {comment}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
