import { memo, useCallback } from 'react';
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

  const indent = depth * 20;

  return (
    <div className={`animate-fade-in ${isSearchMatch ? 'bg-accent/20 rounded' : ''}`}>
      <div
        className="group flex items-center gap-1 py-0.5 px-2 hover:bg-muted/50 rounded-sm cursor-default text-sm"
        style={{ paddingLeft: `${indent + 8}px` }}
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
