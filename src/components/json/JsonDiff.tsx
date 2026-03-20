import { useMemo } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { diffJson, DiffEntry } from '@/utils/diffUtils';
import { ArrowLeftRight } from 'lucide-react';

function DiffEntryRow({ entry }: { entry: DiffEntry }) {
  const bgClass =
    entry.type === 'added' ? 'diff-added' :
    entry.type === 'removed' ? 'diff-removed' :
    'diff-modified';

  const label =
    entry.type === 'added' ? '+ Added' :
    entry.type === 'removed' ? '− Removed' :
    '~ Modified';

  const labelColor =
    entry.type === 'added' ? 'text-syntax-added' :
    entry.type === 'removed' ? 'text-syntax-removed' :
    'text-syntax-modified';

  return (
    <div className={`${bgClass} rounded-md px-3 py-2 text-sm font-mono animate-fade-in`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-semibold ${labelColor}`}>{label}</span>
        <span className="text-muted-foreground text-xs">{entry.path}</span>
      </div>
      <div className="flex gap-4 text-xs">
        {entry.type !== 'added' && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">old:</span>
            <span className="text-syntax-removed">{JSON.stringify(entry.oldValue)}</span>
          </div>
        )}
        {entry.type !== 'removed' && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">new:</span>
            <span className="text-syntax-added">{JSON.stringify(entry.newValue)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JsonDiff() {
  const { diffLeft, diffRight, setDiffLeft, setDiffRight, parsedDiffLeft, parsedDiffRight } = useJsonStore();

  const diffs = useMemo(() => {
    if (!parsedDiffLeft || !parsedDiffRight) return null;
    return diffJson(parsedDiffLeft, parsedDiffRight);
  }, [parsedDiffLeft, parsedDiffRight]);

  const stats = useMemo(() => {
    if (!diffs) return null;
    return {
      added: diffs.filter((d) => d.type === 'added').length,
      removed: diffs.filter((d) => d.type === 'removed').length,
      modified: diffs.filter((d) => d.type === 'modified').length,
    };
  }, [diffs]);

  return (
    <div className="flex flex-col h-full">
      {/* Input panels */}
      <div className="grid grid-cols-2 gap-0 border-b flex-1 min-h-0">
        <div className="flex flex-col border-r">
          <div className="px-3 py-1.5 surface-1 border-b text-xs font-medium text-muted-foreground">
            Left (Original)
          </div>
          <textarea
            value={diffLeft}
            onChange={(e) => setDiffLeft(e.target.value)}
            placeholder="Paste first JSON..."
            spellCheck={false}
            className="flex-1 p-3 bg-transparent font-mono text-xs resize-none outline-none scrollbar-thin placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex flex-col">
          <div className="px-3 py-1.5 surface-1 border-b text-xs font-medium text-muted-foreground">
            Right (Modified)
          </div>
          <textarea
            value={diffRight}
            onChange={(e) => setDiffRight(e.target.value)}
            placeholder="Paste second JSON..."
            spellCheck={false}
            className="flex-1 p-3 bg-transparent font-mono text-xs resize-none outline-none scrollbar-thin placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Diff results */}
      <div className="flex-1 min-h-0 overflow-auto p-4 scrollbar-thin">
        {!parsedDiffLeft || !parsedDiffRight ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
            <ArrowLeftRight className="w-8 h-8 opacity-40" />
            <p>Enter valid JSON on both sides to compare</p>
          </div>
        ) : diffs && diffs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-syntax-string font-medium">
            ✓ Both JSON objects are identical
          </div>
        ) : diffs ? (
          <div className="space-y-2">
            {/* Stats */}
            {stats && (
              <div className="flex items-center gap-3 pb-3 border-b text-xs font-medium">
                <span className="text-syntax-added">+{stats.added} added</span>
                <span className="text-syntax-removed">−{stats.removed} removed</span>
                <span className="text-syntax-modified">~{stats.modified} modified</span>
                <span className="text-muted-foreground">{diffs.length} total changes</span>
              </div>
            )}
            {diffs.map((entry, i) => (
              <DiffEntryRow key={i} entry={entry} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
