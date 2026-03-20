import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import {
  Upload,
  Link,
  FileJson,
  AlignLeft,
  Minimize2,
  Copy,
  Download,
  X,
  FolderOpen,
  BookmarkPlus,
  History,
  Trash2,
  Wand2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { applyJsonTransform, type TransformKind } from '@/utils/jsonTransforms';

const SAMPLE_JSON = JSON.stringify({
  users: [
    { id: 1, name: "Alice Chen", email: "alice@example.com", role: "admin", active: true, score: 94.5 },
    { id: 2, name: "Marcus Rivera", email: "marcus@example.com", role: "editor", active: true, score: 87.2 },
    { id: 3, name: "Yuki Tanaka", email: "yuki@example.com", role: "viewer", active: false, score: 72.8 },
  ],
  metadata: { total: 3, page: 1, perPage: 10, generated: "2026-03-20T10:00:00Z" },
  settings: { theme: "auto", notifications: { email: true, push: false }, limits: { maxUpload: 52428800, maxItems: 1000 } }
}, null, 2);

const TRANSFORMS: Array<{
  id: TransformKind;
  label: string;
  description: string;
  requiresPaths?: boolean;
}> = [
  {
    id: 'sortKeys',
    label: 'Sort keys',
    description: 'Alphabetize object keys recursively across the entire JSON document.',
  },
  {
    id: 'flatten',
    label: 'Flatten object',
    description: 'Convert nested values into a flat object with dot and bracket paths.',
  },
  {
    id: 'pickFields',
    label: 'Pick fields',
    description: 'Keep only selected paths, like $.users[0].name, metadata.total',
    requiresPaths: true,
  },
  {
    id: 'removeEmpty',
    label: 'Remove empty',
    description: 'Remove nulls, empty strings, empty arrays, and empty objects.',
  },
];

export default function JsonInput() {
  const {
    rawInput,
    setRawInput,
    parseError,
    parsedJson,
    recentItems,
    savedItems,
    addRecentItem,
    saveCurrentJson,
    loadWorkspaceItem,
    removeWorkspaceItem,
    pinRecentItem,
    shelfSeen,
    markShelfSeen,
  } = useJsonStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fetchUrl, setFetchUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [transformOpen, setTransformOpen] = useState(false);
  const [transformKind, setTransformKind] = useState<TransformKind>('sortKeys');
  const [transformPaths, setTransformPaths] = useState('');

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
  const recentPreview = useMemo(() => recentItems.slice(0, 6), [recentItems]);
  const savedPreview = useMemo(() => savedItems.slice(0, 6), [savedItems]);

  useEffect(() => {
    if (!isValid || !rawInput.trim()) return;
    const timer = window.setTimeout(() => addRecentItem(rawInput), 900);
    return () => window.clearTimeout(timer);
  }, [addRecentItem, isValid, rawInput]);

  const handleSaveToShelf = useCallback(() => {
    const ok = saveCurrentJson(saveTitle);
    if (!ok) {
      toast.error('Enter valid JSON before saving');
      return;
    }
    setSaveTitle('');
    toast.success('Saved to shelf');
  }, [saveCurrentJson, saveTitle]);

  const handleShelfOpenChange = useCallback(
    (open: boolean) => {
      setShelfOpen(open);
      if (open) markShelfSeen();
    },
    [markShelfSeen],
  );

  const handleLoadItem = useCallback(
    (source: 'recent' | 'saved', id: string) => {
      const ok = loadWorkspaceItem(source, id);
      if (ok) {
        toast.success('Loaded from shelf');
        setShelfOpen(false);
      }
    },
    [loadWorkspaceItem],
  );

  const handlePinRecent = useCallback(
    (id: string) => {
      const ok = pinRecentItem(id);
      if (ok) toast.success('Saved to favorites');
    },
    [pinRecentItem],
  );

  const handleRemoveItem = useCallback(
    (source: 'recent' | 'saved', id: string) => {
      removeWorkspaceItem(source, id);
      toast.success(source === 'saved' ? 'Removed from saved' : 'Removed from recent');
    },
    [removeWorkspaceItem],
  );

  const handleApplyTransform = useCallback(() => {
    if (!isValid || parsedJson === null) {
      toast.error('Enter valid JSON before applying a transform');
      return;
    }
    if (transformKind === 'pickFields' && !transformPaths.trim()) {
      toast.error('Enter one or more comma-separated paths');
      return;
    }
    try {
      const transformed = applyJsonTransform(parsedJson, transformKind, {
        paths: transformPaths,
      });
      setRawInput(JSON.stringify(transformed, null, 2));
      setTransformOpen(false);
      toast.success(`${getTransformLabel(transformKind)} applied`);
    } catch {
      toast.error('Unable to apply transform');
    }
  }, [isValid, parsedJson, setRawInput, transformKind, transformPaths]);

  const activeTransform = TRANSFORMS.find((item) => item.id === transformKind)!;
  const showShelfHint = !shelfSeen;
  const showToolbarShelfSummary = savedPreview.length > 0 || recentPreview.length > 0;

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
        <Sheet open={shelfOpen} onOpenChange={handleShelfOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 text-xs h-7 transition-all ${
                showShelfHint
                  ? 'ring-1 ring-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10'
                  : ''
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Shelf</span>
              {showShelfHint && (
                <span className="hidden sm:inline rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] leading-none">
                  New
                </span>
              )}
              {(savedItems.length > 0 || recentItems.length > 0) && (
                <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none">
                  {savedItems.length + recentItems.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md p-0">
            <SheetHeader className="px-5 py-4 border-b">
              <SheetTitle className="text-base">Workspace Shelf</SheetTitle>
              <SheetDescription>
                Save frequently used payloads and quickly reopen recent valid JSON.
              </SheetDescription>
            </SheetHeader>

            <div className="px-5 py-4 border-b space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Save current JSON</label>
                <div className="flex gap-2">
                  <Input
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="Optional name"
                    className="h-9"
                  />
                  <Button
                    onClick={handleSaveToShelf}
                    disabled={!isValid}
                    className="h-9 gap-1.5"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    Save
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Auto-generated names are used if you leave this blank.
                </p>
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="px-5 py-4 space-y-6">
                <ShelfSection
                  title="Saved"
                  icon={BookmarkPlus}
                  emptyLabel="No saved snippets yet"
                  items={savedItems}
                  onLoad={(id) => handleLoadItem('saved', id)}
                  onDelete={(id) => handleRemoveItem('saved', id)}
                />

                <ShelfSection
                  title="Recent"
                  icon={History}
                  emptyLabel="Recent valid JSON will appear here"
                  items={recentItems}
                  onLoad={(id) => handleLoadItem('recent', id)}
                  onDelete={(id) => handleRemoveItem('recent', id)}
                  onPin={handlePinRecent}
                />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
        <Sheet open={transformOpen} onOpenChange={setTransformOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7">
              <Wand2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Transforms</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md p-0">
            <SheetHeader className="px-5 py-4 border-b">
              <SheetTitle className="text-base">Transforms</SheetTitle>
              <SheetDescription>
                Clean up or reshape JSON without leaving the Viewer.
              </SheetDescription>
            </SheetHeader>

            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {TRANSFORMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTransformKind(item.id)}
                    className={`rounded-xl border px-3 py-3 text-left transition-all ${
                      transformKind === item.id
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border bg-card/50 hover:bg-muted/60'
                    }`}
                  >
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.description}
                    </div>
                  </button>
                ))}
              </div>

              {activeTransform.requiresPaths && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Comma-separated paths
                  </label>
                  <Input
                    value={transformPaths}
                    onChange={(e) => setTransformPaths(e.target.value)}
                    placeholder="$.users[0].name, metadata.total"
                    className="h-9"
                  />
                </div>
              )}

              <div className="rounded-xl border bg-muted/40 px-3 py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  What this does
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeTransform.description}
                </p>
              </div>

              <Button
                onClick={handleApplyTransform}
                disabled={!isValid}
                className="w-full gap-2"
              >
                <Wand2 className="w-4 h-4" />
                Apply {activeTransform.label}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

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

        {showToolbarShelfSummary && (
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {savedPreview.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                <BookmarkPlus className="w-3 h-3" />
                {savedPreview.length} saved
              </span>
            )}
            {recentPreview.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                <History className="w-3 h-3" />
                {recentPreview.length} recent
              </span>
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
        {showShelfHint && (
          <div className="absolute top-3 right-3 z-10 max-w-[280px] rounded-2xl border bg-background/95 px-3 py-3 shadow-lg backdrop-blur">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 rounded-lg bg-emerald-500/12 p-1.5 text-emerald-500">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">New: Workspace Shelf</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Save reusable payloads and reopen recent JSON instantly.
                </p>
                <button
                  type="button"
                  onClick={() => handleShelfOpenChange(true)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                >
                  Open Shelf
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
        {!hasInput && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
              <FileJson className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground/70">Paste JSON or drag & drop a file</p>
              <p className="text-xs text-muted-foreground/40">Supports .json files up to any size</p>
            </div>
            {showShelfHint && (
              <button
                type="button"
                onClick={() => handleShelfOpenChange(true)}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Open Shelf
              </button>
            )}
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

function ShelfSection({
  title,
  icon: Icon,
  emptyLabel,
  items,
  onLoad,
  onDelete,
  onPin,
}: {
  title: string;
  icon: typeof BookmarkPlus;
  emptyLabel: string;
  items: ReturnType<typeof useJsonStore.getState>['savedItems'];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onPin?: (id: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border bg-card/50 p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatWorkspaceTime(item.updatedAt)} · {formatWorkspaceBytes(item.bytes)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {onPin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Save to favorites"
                      onClick={() => onPin(item.id)}
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    title="Remove"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onLoad(item.id)}
                className="w-full rounded-lg bg-muted/60 px-3 py-2 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted"
              >
                <div className="truncate">{compactPreview(item.raw)}</div>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function compactPreview(raw: string): string {
  return raw.replace(/\s+/g, ' ').slice(0, 88);
}

function formatWorkspaceBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWorkspaceTime(updatedAt: number): string {
  const diff = Date.now() - updatedAt;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getTransformLabel(kind: TransformKind): string {
  return TRANSFORMS.find((item) => item.id === kind)?.label ?? 'Transform';
}
