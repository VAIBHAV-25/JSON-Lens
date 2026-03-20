import { extractByPath, flattenJson, sortJsonKeys } from '@/utils/jsonUtils';

export type TransformKind =
  | 'sortKeys'
  | 'flatten'
  | 'pickFields'
  | 'removeEmpty';

export function applyJsonTransform(
  value: unknown,
  kind: TransformKind,
  options?: { paths?: string },
): unknown {
  if (kind === 'sortKeys') return sortJsonKeys(value);
  if (kind === 'flatten') return flattenJson(value);
  if (kind === 'pickFields') return pickFields(value, options?.paths ?? '');
  return removeEmptyValues(value);
}

export function pickFields(value: unknown, rawPaths: string): unknown {
  const paths = rawPaths
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (paths.length === 0) return value;

  const firstPath = normalizePath(paths[0]);
  const root: Record<string, unknown> | unknown[] =
    typeof firstPath[0] === 'number' ? [] : {};

  for (const path of paths) {
    const { value: extracted, found } = extractByPath(value, path);
    if (!found) continue;
    assignPath(root, path, extracted);
  }

  return root;
}

export function removeEmptyValues(value: unknown): unknown {
  const cleaned = cleanNode(value);
  return cleaned === undefined ? {} : cleaned;
}

function cleanNode(value: unknown): unknown {
  if (value === null || value === '') return undefined;

  if (Array.isArray(value)) {
    const next = value
      .map((item) => cleanNode(item))
      .filter((item) => item !== undefined);
    return next.length === 0 ? undefined : next;
  }

  if (value && typeof value === 'object') {
    const next = Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (acc, [key, child]) => {
        const cleaned = cleanNode(child);
        if (cleaned !== undefined) acc[key] = cleaned;
        return acc;
      },
      {},
    );
    return Object.keys(next).length === 0 ? undefined : next;
  }

  return value;
}

function assignPath(target: Record<string, unknown> | unknown[], path: string, value: unknown): void {
  const parts = normalizePath(path);
  if (parts.length === 0) return;

  let cursor: Record<string, unknown> | unknown[] = target;

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const isLast = index === parts.length - 1;
    const nextPart = parts[index + 1];

    if (typeof part === 'number') {
      if (!Array.isArray(cursor)) return;
      if (isLast) {
        cursor[part] = value;
      } else {
        const existing = cursor[part];
        const nextContainer =
          existing && typeof existing === 'object'
            ? existing
            : typeof nextPart === 'number'
              ? []
              : {};
        cursor[part] = nextContainer;
        cursor = nextContainer as Record<string, unknown> | unknown[];
      }
      continue;
    }

    if (isLast) {
      (cursor as Record<string, unknown>)[part] = value;
      continue;
    }

    const existing = (cursor as Record<string, unknown>)[part];
    const nextContainer =
      existing && typeof existing === 'object'
        ? existing
        : typeof nextPart === 'number'
          ? []
          : {};
    (cursor as Record<string, unknown>)[part] = nextContainer;
    cursor = nextContainer as Record<string, unknown> | unknown[];
  }
}

function normalizePath(path: string): Array<string | number> {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/^\$\.?/, '')
    .split('.')
    .filter(Boolean)
    .map((part) => {
      const numeric = Number(part);
      return Number.isInteger(numeric) && part === String(numeric) ? numeric : part;
    });
}
