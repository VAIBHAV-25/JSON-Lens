/**
 * Flatten a nested JSON object into dot-notation key-value pairs.
 * e.g., { a: { b: 1 } } → { "a.b": 1 }
 */
export function flattenJson(
  obj: unknown,
  prefix = '',
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  if (obj === null || obj === undefined) {
    result[prefix] = obj;
    return result;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result[prefix] = [];
      return result;
    }
    obj.forEach((item, i) => {
      flattenJson(item, prefix ? `${prefix}[${i}]` : `[${i}]`, result);
    });
    return result;
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) {
      result[prefix] = {};
      return result;
    }
    for (const [key, value] of entries) {
      flattenJson(value, prefix ? `${prefix}.${key}` : key, result);
    }
    return result;
  }

  result[prefix] = obj;
  return result;
}

/** Convert JSON array of objects to CSV string */
export function jsonToCsv(data: unknown): string {
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) return '';

  // Collect all keys from all objects
  const keys = new Set<string>();
  for (const item of arr) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      Object.keys(item as Record<string, unknown>).forEach((k) => keys.add(k));
    }
  }

  const headers = Array.from(keys);
  const rows = arr.map((item) => {
    const obj = (item && typeof item === 'object' ? item : { value: item }) as Record<string, unknown>;
    return headers
      .map((h) => {
        const val = obj[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/** Sort JSON object keys alphabetically (recursive) */
export function sortJsonKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortJsonKeys);

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    sorted[key] = sortJsonKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/** Get the display type of a JSON value */
export function getJsonType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/** Count items in a JSON value */
export function getItemCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value as object).length;
  return 0;
}

/** Live stats computed from parsed JSON */
export interface JsonStats {
  total: number;
  objects: number;
  arrays: number;
  strings: number;
  numbers: number;
  booleans: number;
  nulls: number;
  maxDepth: number;
}

export function computeStats(json: unknown): JsonStats {
  const s: JsonStats = { total: 0, objects: 0, arrays: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0, maxDepth: 0 };
  function walk(v: unknown, depth: number) {
    s.total++;
    if (depth > s.maxDepth) s.maxDepth = depth;
    const t = getJsonType(v);
    if (t === 'object' && v !== null) { s.objects++; Object.values(v as object).forEach(c => walk(c, depth + 1)); }
    else if (t === 'array') { s.arrays++; (v as unknown[]).forEach(c => walk(c, depth + 1)); }
    else if (t === 'string') s.strings++;
    else if (t === 'number') s.numbers++;
    else if (t === 'boolean') s.booleans++;
    else s.nulls++;
  }
  walk(json, 0);
  return s;
}

/** Extract a value by dot/bracket path, e.g. "users[0].name" */
export function extractByPath(json: unknown, path: string): { value: unknown; found: boolean } {
  if (!path.trim()) return { value: json, found: true };
  const parts: (string | number)[] = [];
  const norm = path.replace(/\[(\d+)\]/g, '.$1').replace(/^\$\.?/, '');
  for (const part of norm.split('.').filter(Boolean)) {
    parts.push(isNaN(Number(part)) ? part : Number(part));
  }
  let cur: unknown = json;
  for (const p of parts) {
    if (cur === null || cur === undefined) return { value: undefined, found: false };
    if (typeof cur !== 'object') return { value: undefined, found: false };
    cur = Array.isArray(cur)
      ? typeof p === 'number' ? cur[p] : undefined
      : (cur as Record<string, unknown>)[String(p)];
  }
  return { value: cur, found: cur !== undefined };
}

/** Detect if JSON has chartable structure (array of objects with numeric values) */
export function detectChartableKeys(data: unknown): { labels: string[]; numeric: string[] } {
  if (!Array.isArray(data) || data.length === 0) return { labels: [], numeric: [] };

  const first = data[0];
  if (!first || typeof first !== 'object' || Array.isArray(first)) return { labels: [], numeric: [] };

  const labels: string[] = [];
  const numeric: string[] = [];

  for (const [key, value] of Object.entries(first as Record<string, unknown>)) {
    if (typeof value === 'number') numeric.push(key);
    else if (typeof value === 'string') labels.push(key);
  }

  return { labels, numeric };
}
