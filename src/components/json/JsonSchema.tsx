import { useMemo, useState, memo, useCallback } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { getJsonType } from '@/utils/jsonUtils';
import { Copy, Download, FileCode2, ChevronRight, ChevronDown, CheckCircle2, Braces, Hash, ToggleLeft, Minus, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type JSONSchema = {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  additionalProperties?: boolean;
  format?: string;
  $schema?: string;
  description?: string;
};

function detectFormat(value: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return 'date-time';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) return 'email';
  if (/^https?:\/\//.test(value)) return 'uri';
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return 'time';
  return undefined;
}

function mergeSchemas(schemas: JSONSchema[]): JSONSchema {
  if (schemas.length === 0) return {};
  if (schemas.length === 1) return schemas[0];
  const types = [...new Set(schemas.map((s) => s.type as string).filter(Boolean))];
  if (types.length === 1 && types[0] === 'object') {
    const allKeys = new Set(schemas.flatMap((s) => Object.keys(s.properties || {})));
    const properties: Record<string, JSONSchema> = {};
    for (const key of allKeys) {
      const keySchemas = schemas.filter((s) => s.properties?.[key]).map((s) => s.properties![key]);
      properties[key] = keySchemas.length ? mergeSchemas(keySchemas) : {};
    }
    return { type: 'object', properties };
  }
  if (types.length === 1) return schemas[0];
  return { type: types };
}

function inferSchema(value: unknown): JSONSchema {
  const type = getJsonType(value);
  if (type === 'null') return { type: 'null' };
  if (type === 'boolean') return { type: 'boolean' };
  if (type === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number' };
  if (type === 'string') {
    const schema: JSONSchema = { type: 'string' };
    const fmt = detectFormat(value as string);
    if (fmt) schema.format = fmt;
    return schema;
  }
  if (type === 'array') {
    const arr = value as unknown[];
    if (arr.length === 0) return { type: 'array', items: {} };
    return { type: 'array', items: mergeSchemas(arr.slice(0, 20).map(inferSchema)) };
  }
  if (type === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    const properties: Record<string, JSONSchema> = {};
    for (const [key, val] of Object.entries(obj)) properties[key] = inferSchema(val);
    return { type: 'object', properties, required: Object.keys(obj), additionalProperties: false };
  }
  return {};
}

const TYPE_ICON: Record<string, typeof Braces> = {
  object: Braces,
  array: List,
  string: Minus,
  number: Hash,
  integer: Hash,
  boolean: ToggleLeft,
  null: Minus,
};

const TYPE_COLOR: Record<string, string> = {
  object:  'text-indigo-500 bg-indigo-500/10',
  array:   'text-blue-500 bg-blue-500/10',
  string:  'text-emerald-500 bg-emerald-500/10',
  number:  'text-amber-500 bg-amber-500/10',
  integer: 'text-amber-500 bg-amber-500/10',
  boolean: 'text-orange-500 bg-orange-500/10',
  null:    'text-slate-400 bg-slate-400/10',
};

const FORMAT_COLOR: Record<string, string> = {
  'date-time': 'text-violet-400 bg-violet-400/10',
  'date': 'text-violet-400 bg-violet-400/10',
  'time': 'text-violet-400 bg-violet-400/10',
  'email': 'text-cyan-400 bg-cyan-400/10',
  'uri': 'text-cyan-400 bg-cyan-400/10',
};

interface SchemaNodeProps {
  name: string | null;
  schema: JSONSchema;
  required?: boolean;
  depth: number;
  isLast: boolean;
}

const SchemaNode = memo(function SchemaNode({ name, schema, required, depth, isLast }: SchemaNodeProps) {
  const [open, setOpen] = useState(depth < 2);
  const type = Array.isArray(schema.type) ? schema.type.join(' | ') : (schema.type || 'any');
  const hasChildren = (schema.type === 'object' && schema.properties) || schema.type === 'array';
  const TypeIcon = TYPE_ICON[type] || Minus;
  const typeColor = TYPE_COLOR[type] || 'text-muted-foreground bg-muted';

  const toggle = useCallback(() => {
    if (hasChildren) setOpen((o) => !o);
  }, [hasChildren]);

  const indent = depth * 18;

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-1 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-default"
        style={{ paddingLeft: indent + 8 }}
        onClick={toggle}
      >
        <span className="w-4 flex-shrink-0 flex items-center justify-center">
          {hasChildren ? (
            open
              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          ) : null}
        </span>

        {name !== null && (
          <span className="font-mono text-sm json-key flex-shrink-0">{name}</span>
        )}

        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${typeColor}`}>
          <TypeIcon className="w-2.5 h-2.5" />
          {type}
        </span>

        {schema.format && (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${FORMAT_COLOR[schema.format] || 'text-muted-foreground bg-muted'}`}>
            {schema.format}
          </span>
        )}

        {required && (
          <span className="text-[10px] text-rose-400 font-medium flex-shrink-0">required</span>
        )}

        {schema.type === 'array' && schema.items && (
          <span className="text-[10px] text-muted-foreground ml-1">
            → {Array.isArray(schema.items.type) ? schema.items.type.join(' | ') : schema.items.type || 'any'}
          </span>
        )}
      </div>

      {hasChildren && open && (
        <div>
          {schema.type === 'object' && schema.properties &&
            Object.entries(schema.properties).map(([key, childSchema], i, arr) => (
              <SchemaNode
                key={key}
                name={key}
                schema={childSchema}
                required={schema.required?.includes(key)}
                depth={depth + 1}
                isLast={i === arr.length - 1}
              />
            ))
          }
          {schema.type === 'array' && schema.items && Object.keys(schema.items).length > 0 && (
            <SchemaNode
              name="items"
              schema={schema.items}
              depth={depth + 1}
              isLast={true}
            />
          )}
        </div>
      )}
    </div>
  );
});

function countSchemaNodes(schema: JSONSchema): number {
  let count = 1;
  if (schema.properties) {
    for (const child of Object.values(schema.properties)) {
      count += countSchemaNodes(child);
    }
  }
  if (schema.items && Object.keys(schema.items).length > 0) {
    count += countSchemaNodes(schema.items);
  }
  return count;
}

function countRequired(schema: JSONSchema): number {
  let count = schema.required?.length || 0;
  if (schema.properties) {
    for (const child of Object.values(schema.properties)) {
      count += countRequired(child);
    }
  }
  if (schema.items) count += countRequired(schema.items);
  return count;
}

export default function JsonSchema() {
  const { parsedJson } = useJsonStore();
  const [view, setView] = useState<'tree' | 'json'>('tree');

  const schema = useMemo(() => {
    if (!parsedJson) return null;
    return { $schema: 'http://json-schema.org/draft-07/schema#', ...inferSchema(parsedJson) };
  }, [parsedJson]);

  const schemaJson = useMemo(() => (schema ? JSON.stringify(schema, null, 2) : ''), [schema]);

  const nodeCount = useMemo(() => (schema ? countSchemaNodes(schema) : 0), [schema]);
  const requiredCount = useMemo(() => (schema ? countRequired(schema) : 0), [schema]);

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaJson);
    toast.success('Schema copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([schemaJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!parsedJson) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
          <FileCode2 className="w-7 h-7 opacity-40" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">No JSON loaded</p>
          <p className="text-xs text-muted-foreground/70">Load JSON in the Viewer tab to infer its schema</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b surface-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">JSON Schema</span>
          <span className="text-xs text-muted-foreground/60 hidden sm:inline">Draft-07</span>
        </div>

        <div className="flex items-center gap-3 ml-2">
          <span className="text-[11px] text-muted-foreground">
            <span className="font-mono font-medium text-foreground">{nodeCount}</span> fields
          </span>
          <span className="text-[11px] text-muted-foreground">
            <span className="font-mono font-medium text-rose-400">{requiredCount}</span> required
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60 border border-border/40">
          {(['tree', 'json'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                view === v ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v === 'tree' ? 'Tree' : 'JSON'}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs h-7">
          <Copy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Copy</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-1.5 text-xs h-7">
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Download</span>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {view === 'tree' ? (
          <div className="p-2">
            <SchemaNode name={null} schema={schema!} depth={0} isLast={true} />
          </div>
        ) : (
          <div className="p-4">
            <SchemaJsonView json={schemaJson} />
          </div>
        )}
      </div>
    </div>
  );
}

function SchemaJsonView({ json }: { json: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlighted = useMemo(() => {
    return json.replace(
      /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(true|false|null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
      (match, key, str, literal, num) => {
        if (key) return `<span class="json-key">${key}</span>:`;
        if (str) return `<span class="json-string">${str}</span>`;
        if (literal) return `<span class="${literal === 'null' ? 'json-null' : 'json-boolean'}">${literal}</span>`;
        if (num) return `<span class="json-number">${num}</span>`;
        return match;
      }
    );
  }, [json]);

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border text-xs text-muted-foreground hover:text-foreground"
      >
        {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre
        className="font-mono text-xs leading-relaxed p-4 rounded-lg bg-muted/30 border border-border/50 overflow-auto"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}
