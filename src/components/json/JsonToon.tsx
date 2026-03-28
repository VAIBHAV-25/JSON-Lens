import { useMemo, useState, useCallback, Fragment } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { FileText, Copy, Download, Code2, Sparkles, MoveHorizontal, Info } from 'lucide-react';
import { toast } from 'sonner';
import { jsonToToon } from 'toon-parser';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

function highlightToonContent(content: string) {
  const tokens = content.split(/(\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?\b|,|"[^"]*")/g);
  return tokens.map((part, i) => {
    if (!part) return null;
    if (part === 'true' || part === 'false') return <span key={i} className="text-orange-600 dark:text-orange-400 font-semibold">{part}</span>;
    if (part === 'null') return <span key={i} className="text-slate-500 dark:text-slate-400 italic">{part}</span>;
    if (/^-?\d+(?:\.\d+)?$/.test(part)) return <span key={i} className="text-amber-600 dark:text-amber-400">{part}</span>;
    if (part === ',') return <span key={i} className="text-muted-foreground/40">{part}</span>;
    if (part.startsWith('"') && part.endsWith('"')) return <span key={i} className="text-emerald-600 dark:text-emerald-400">{part}</span>;
    return <span key={i} className="text-emerald-600 dark:text-emerald-400">{part}</span>;
  });
}

function HighlightedToon({ toonString }: { toonString: string }) {
  const lines = toonString.split('\n');

  return (
    <div className="font-mono text-[13px] leading-relaxed text-foreground bg-card rounded-xl border border-border shadow-md overflow-hidden flex flex-col m-3 h-[calc(100%-1.5rem)] relative">
      <div className="flex items-center gap-2 px-4 py-2 bg-fuchsia-500/10 border-b border-border/50">
        <Sparkles className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
        <span className="text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300 tracking-wide uppercase">TOON Format</span>
      </div>
      <div className="flex-1 overflow-auto bg-background scrollbar-thin">
        <div className="min-w-max py-4">
          <div className="table w-full border-collapse">
            {lines.map((line, index) => {
              const indentMatch = line.match(/^(\s*)/);
              const indentStr = indentMatch ? indentMatch[1] : '';
              const indent = <span className="whitespace-pre">{indentStr}</span>;
              const content = line.substring(indentStr.length);

              const arrHeaderMatch = content.match(/^([^\[]+)\[(\d+)\]\{([^}]+)\}:$/);
              if (arrHeaderMatch) {
                return (
                  <div key={index} className="table-row hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                    <span className="table-cell text-muted-foreground/40 group-hover:text-muted-foreground/60 select-none pr-4 pl-4 text-right w-12 border-r border-border/40 text-[11px] align-middle">{index + 1}</span>
                    <span className="table-cell pl-4 pr-6 align-middle py-0.5 whitespace-pre">
                      {indent}
                      <span className="text-fuchsia-600 dark:text-fuchsia-400 font-semibold">{arrHeaderMatch[1]}</span>
                      <span className="text-muted-foreground/50">[</span>
                      <span className="text-sky-600 dark:text-sky-400 font-semibold">{arrHeaderMatch[2]}</span>
                      <span className="text-muted-foreground/50">]</span>
                      <span className="text-muted-foreground/50">{"{"}</span>
                      <span className="text-orange-600 dark:text-orange-400">{arrHeaderMatch[3]}</span>
                      <span className="text-muted-foreground/50">{"}"}</span>
                      <span className="text-fuchsia-600/80 dark:text-fuchsia-400/80">:</span>
                    </span>
                  </div>
                );
              }

              const keyMatch = content.match(/^([^:]+):$/);
              if (keyMatch) {
                return (
                  <div key={index} className="table-row hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                    <span className="table-cell text-muted-foreground/40 group-hover:text-muted-foreground/60 select-none pr-4 pl-4 text-right w-12 border-r border-border/40 text-[11px] align-middle">{index + 1}</span>
                    <span className="table-cell pl-4 pr-6 align-middle py-0.5 whitespace-pre">
                      {indent}
                      <span className="text-fuchsia-600 dark:text-fuchsia-400 font-semibold">{keyMatch[1]}</span>
                      <span className="text-fuchsia-600/80 dark:text-fuchsia-400/80">:</span>
                    </span>
                  </div>
                );
              }

              const kvMatch = content.match(/^([^:]+):\s+(.*)$/);
              if (kvMatch) {
                return (
                  <div key={index} className="table-row hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                    <span className="table-cell text-muted-foreground/40 group-hover:text-muted-foreground/60 select-none pr-4 pl-4 text-right w-12 border-r border-border/40 text-[11px] align-middle">{index + 1}</span>
                    <span className="table-cell pl-4 pr-6 align-middle py-0.5 whitespace-pre">
                      {indent}
                      <span className="text-fuchsia-600 dark:text-fuchsia-400">{kvMatch[1]}</span>
                      <span className="text-fuchsia-600/80 dark:text-fuchsia-400/80">: </span>
                      {highlightToonContent(kvMatch[2])}
                    </span>
                  </div>
                );
              }

              return (
                <div key={index} className="table-row hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                  <span className="table-cell text-muted-foreground/40 group-hover:text-muted-foreground/60 select-none pr-4 pl-4 text-right w-12 border-r border-border/40 text-[11px] align-middle">{index + 1}</span>
                  <span className="table-cell pl-4 pr-6 align-middle py-0.5 whitespace-pre">
                    {indent}
                    {content ? highlightToonContent(content) : <span className="inline-block h-4" />}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function highlightJsonTokens(content: string) {
  const tokens = content.split(/("[^"]*"\s*:|"[^"]*"|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\btrue\b|\bfalse\b|\bnull\b|[{}\[\]:,])/g);
  return tokens.map((part, i) => {
    if (!part) return null;
    if (part === 'true' || part === 'false') return <span key={i} className="text-orange-600 dark:text-orange-400 font-semibold">{part}</span>;
    if (part === 'null') return <span key={i} className="text-slate-500 dark:text-slate-400 italic">{part}</span>;
    if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(part)) return <span key={i} className="text-amber-600 dark:text-amber-400">{part}</span>;
    
    // Key (like "name":)
    const keyMatch = part.match(/^("[^"]*")(\s*:)$/);
    if (keyMatch) {
      return (
        <span key={i}>
          <span className="text-indigo-600 dark:text-indigo-300 font-medium">{keyMatch[1]}</span>
          <span className="text-muted-foreground/60">{keyMatch[2]}</span>
        </span>
      );
    }
    
    if (part.startsWith('"') && part.endsWith('"')) return <span key={i} className="text-emerald-600 dark:text-emerald-400">{part}</span>;
    if (part === '{' || part === '}' || part === '[' || part === ']') return <span key={i} className="text-sky-600 dark:text-sky-400">{part}</span>;
    if (part === ',' || part === ':') return <span key={i} className="text-muted-foreground/60">{part}</span>;
    
    return <span key={i} className="text-foreground/80">{part}</span>;
  });
}

function HighlightedJson({ jsonString }: { jsonString: string }) {
  const lines = jsonString.split('\n');

  return (
    <div className="font-mono text-[13px] leading-relaxed text-foreground bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col m-3 h-[calc(100%-1.5rem)] relative">
      <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border-b border-border/50">
        <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 tracking-wide uppercase">JSON Format</span>
      </div>
      <div className="flex-1 overflow-auto bg-background scrollbar-thin">
        <div className="min-w-max py-4">
          <div className="table w-full border-collapse">
            {lines.map((line, index) => (
              <div key={index} className="table-row hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                <span className="table-cell text-muted-foreground/40 group-hover:text-muted-foreground/60 select-none pr-4 pl-4 text-right w-12 border-r border-border/40 text-[11px] align-middle">{index + 1}</span>
                <span className="table-cell pl-4 pr-6 align-middle py-0.5 whitespace-pre">
                  {line ? highlightJsonTokens(line) : <span className="inline-block h-4" />}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JsonToon() {
  const { parsedJson } = useJsonStore();
  const [copied, setCopied] = useState(false);

  const jsonString = useMemo(() => {
    if (!parsedJson) return '';
    return JSON.stringify(parsedJson, null, 2);
  }, [parsedJson]);

  const toonString = useMemo(() => {
    if (!parsedJson) return '';
    try {
      return jsonToToon(parsedJson);
    } catch (err) {
      return `Error generating TOON: ${(err as Error).message}`;
    }
  }, [parsedJson]);

  // Compute savings
  const jsonLen = jsonString.length;
  const toonLen = toonString.length;
  const savings = jsonLen > 0 ? Math.max(0, Math.round((1 - toonLen / jsonLen) * 100)) : 0;

  const copyToClipboard = useCallback(() => {
    if (!toonString) return;
    navigator.clipboard.writeText(toonString);
    setCopied(true);
    toast.success('Copied TOON format to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [toonString]);

  const downloadToon = useCallback(() => {
    if (!toonString) return;
    const blob = new Blob([toonString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.toon';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded data.toon');
  }, [toonString]);

  if (!parsedJson) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 text-muted-foreground bg-gradient-to-br from-background via-background to-fuchsia-950/10">
        <div className="relative">
          <div className="absolute inset-0 bg-fuchsia-500/20 blur-xl rounded-full" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 border border-fuchsia-500/20 flex items-center justify-center shadow-lg shadow-fuchsia-500/5">
            <FileText className="w-8 h-8 text-fuchsia-600 dark:text-fuchsia-400 drop-shadow-md" />
          </div>
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-base font-semibold text-foreground/80">No JSON loaded</p>
          <p className="text-sm text-muted-foreground/70 max-w-xs">Load JSON in the Viewer tab to explore Token-Oriented Object Notation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/30 dark:bg-gradient-to-br dark:from-background dark:via-background dark:to-fuchsia-950/5 overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b bg-card/40 backdrop-blur-md flex-shrink-0 shadow-sm z-10 relative border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 border border-fuchsia-500/30 flex items-center justify-center shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-600 dark:text-fuchsia-400 drop-shadow-sm" />
          </div>
          <span className="text-xs font-bold text-foreground/90 tracking-wide">TOON Sandbox</span>
        </div>
        
        {savings > 0 && (
          <div className="ml-4 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
              {savings}% Text Reduction
            </span>
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            title="Copy TOON"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-fuchsia-500/20 bg-fuchsia-500/5 hover:bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 transition-all shadow-sm"
          >
            {copied ? (
              <span className="font-bold flex items-center gap-1 text-emerald-600 dark:text-emerald-400">✓ Copied</span>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy TOON
              </>
            )}
          </button>
          <button
            onClick={downloadToon}
            title="Download as .toon"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-border/50 bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      </div>

      {/* ── Side by Side Workspace ── */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {toonString.startsWith('Error') ? (
          <div className="p-4 text-red-500 dark:text-red-400 text-sm font-mono whitespace-pre-wrap">{toonString}</div>
        ) : (
          <>
            {/* ── Info Banner ── */}
            <div className="mx-3 mt-3 px-4 py-3 bg-fuchsia-500/5 rounded-xl border border-fuchsia-500/15 flex gap-3 text-sm shadow-sm shrink-0">
              <div className="shrink-0 pt-0.5">
                <Info className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400/80" />
              </div>
              <div className="text-muted-foreground/90 space-y-1 leading-relaxed">
                <p>
                  <strong className="text-foreground/90 font-medium tracking-wide mr-1 shadow-sm">Token-Oriented Object Notation (TOON)</strong>
                  is a lightweight data format explicitly optimized for Large Language Models (LLMs).
                </p>
                <p className="text-[12px] opacity-80">
                  By stripping out standard JSON syntactic noise (quotes, curly braces) and using tabular structures for arrays, TOON drastically reduces the <strong className="font-semibold text-foreground">token count</strong>. This lowers API costs and preserves valuable context-window space while remaining 100% reversible back to JSON.
                </p>
              </div>
            </div>
            
            <div className="flex-1 min-h-0 relative">
              <PanelGroup direction="horizontal">
                <Panel defaultSize={45} minSize={20}>
                  <HighlightedJson jsonString={jsonString} />
                </Panel>
                
                <PanelResizeHandle className="w-4 ml-[-4px] mr-[-4px] relative group cursor-col-resize flex flex-col justify-center">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-border/40 group-hover:bg-fuchsia-500/50 transition-colors" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background border border-border shadow-sm w-4 h-[32px] flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <MoveHorizontal className="w-2.5 h-2.5 text-muted-foreground" />
                  </div>
                </PanelResizeHandle>
                
                <Panel defaultSize={55} minSize={20}>
                  <HighlightedToon toonString={toonString} />
                </Panel>
              </PanelGroup>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
