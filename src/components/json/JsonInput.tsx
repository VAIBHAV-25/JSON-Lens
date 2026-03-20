import { useCallback, useRef, useState } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { Upload, Link, AlertCircle, CheckCircle2, FileJson, AlignLeft, Minimize2, Copy, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const SAMPLE_JSON = JSON.stringify({
  users: [
    { id: 1, name: "Alice Chen", email: "alice@example.com", role: "admin", active: true, score: 94.5 },
    { id: 2, name: "Marcus Rivera", email: "marcus@example.com", role: "editor", active: true, score: 87.2 },
    { id: 3, name: "Yuki Tanaka", email: "yuki@example.com", role: "viewer", active: false, score: 72.8 },
  ],
  metadata: { total: 3, page: 1, perPage: 10, generated: "2026-03-20T10:00:00Z" },
  settings: { theme: "auto", notifications: { email: true, push: false }, limits: { maxUpload: 52428800, maxItems: 1000 } }
}, null, 2);

export default function JsonInput() {
  const { rawInput, setRawInput, parseError, parsedJson } = useJsonStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fetchUrl, setFetchUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [fetching, setFetching] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRawInput(ev.target?.result as string);
    reader.readAsText(file);
    e.target.value = '';
  }, [setRawInput]);

  const handleFetchUrl = useCallback(async () => {
    if (!fetchUrl.trim()) return;
    setFetching(true);
    try {
      const res = await fetch(fetchUrl);
      const text = await res.text();
      setRawInput(text);
      setShowUrlInput(false);
      setFetchUrl('');
    } catch {
      toast.error(`Failed to fetch from: ${fetchUrl}`);
    } finally {
      setFetching(false);
    }
  }, [fetchUrl, setRawInput]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setRawInput(ev.target?.result as string);
      reader.readAsText(file);
    }
  }, [setRawInput]);

  const handleFormat = useCallback(() => {
    if (!parsedJson) return;
    setRawInput(JSON.stringify(parsedJson, null, 2));
    toast.success('JSON formatted');
  }, [parsedJson, setRawInput]);

  const handleMinify = useCallback(() => {
    if (!parsedJson) return;
    setRawInput(JSON.stringify(parsedJson));
    toast.success('JSON minified');
  }, [parsedJson, setRawInput]);

  const handleCopy = useCallback(() => {
    if (!rawInput.trim()) return;
    navigator.clipboard.writeText(rawInput);
    toast.success('Copied to clipboard');
  }, [rawInput]);

  const handleDownload = useCallback(() => {
    if (!rawInput.trim()) return;
    const blob = new Blob([rawInput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded data.json');
  }, [rawInput]);

  const handleClear = useCallback(() => {
    setRawInput('');
  }, [setRawInput]);

  const isValid = rawInput.trim() !== '' && parsedJson !== null;
  const hasInput = rawInput.trim() !== '';

  const byteSize = getByteSize(rawInput);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Primary toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b surface-1 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5 text-xs h-7">
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowUrlInput(!showUrlInput)} className="gap-1.5 text-xs h-7">
          <Link className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">URL</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setRawInput(SAMPLE_JSON)} className="gap-1.5 text-xs h-7">
          <FileJson className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sample</span>
        </Button>

        <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileUpload} />

        {hasInput && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Button variant="ghost" size="sm" onClick={handleFormat} disabled={!isValid} className="gap-1.5 text-xs h-7" title="Pretty print">
              <AlignLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Format</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleMinify} disabled={!isValid} className="gap-1.5 text-xs h-7" title="Minify JSON">
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Minify</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs h-7" title="Copy to clipboard">
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-1.5 text-xs h-7" title="Download as JSON">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-xs h-7 text-muted-foreground hover:text-destructive" title="Clear">
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        )}

        <div className="flex-1" />

        {hasInput && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${isValid ? 'text-emerald-500' : 'text-destructive'}`}>
            {isValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isValid ? 'Valid JSON' : 'Invalid'}</span>
            {isValid && byteSize && (
              <span className="text-muted-foreground font-normal hidden md:inline">· {byteSize}</span>
            )}
          </div>
        )}
      </div>

      {/* URL fetch bar */}
      {showUrlInput && (
        <div className="flex items-center gap-2 px-4 py-2 border-b surface-2 flex-shrink-0">
          <input
            type="url"
            value={fetchUrl}
            onChange={(e) => setFetchUrl(e.target.value)}
            placeholder="https://api.example.com/data.json"
            className="flex-1 bg-transparent text-sm font-mono outline-none placeholder:text-muted-foreground/60"
            onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
            autoFocus
          />
          <Button size="sm" onClick={handleFetchUrl} disabled={fetching} className="text-xs h-7">
            {fetching ? 'Fetching…' : 'Fetch'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowUrlInput(false)} className="h-7 w-7 p-0">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 relative min-h-0" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
        {!hasInput && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none px-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
              <FileJson className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground/70">Paste JSON or drag & drop a file</p>
              <p className="text-xs text-muted-foreground/40">Supports .json files up to any size</p>
            </div>
          </div>
        )}
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          spellCheck={false}
          className="w-full h-full p-4 bg-transparent font-mono text-sm resize-none outline-none scrollbar-thin placeholder:text-muted-foreground/50"
          style={{ caretColor: 'hsl(var(--primary))' }}
        />
      </div>

      {/* Error bar */}
      {parseError && hasInput && (
        <div className="px-4 py-2 border-t text-xs font-mono text-destructive bg-destructive/5 truncate flex-shrink-0">
          <AlertCircle className="w-3 h-3 inline mr-1.5" />
          {parseError}
        </div>
      )}
    </div>
  );
}

function getByteSize(rawInput: string): string | null {
  if (!rawInput.trim()) return null;
  const bytes = new TextEncoder().encode(rawInput).length;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
