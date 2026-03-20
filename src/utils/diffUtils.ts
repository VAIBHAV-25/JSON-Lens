export interface DiffEntry {
  path: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Deep diff two JSON values. Returns array of path-level differences.
 */
export function diffJson(left: unknown, right: unknown, path = '$'): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  if (left === right) return diffs;

  // Both null or primitive
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') {
    diffs.push({ path, type: 'modified', oldValue: left, newValue: right });
    return diffs;
  }

  const leftIsArray = Array.isArray(left);
  const rightIsArray = Array.isArray(right);

  // Type mismatch (array vs object)
  if (leftIsArray !== rightIsArray) {
    diffs.push({ path, type: 'modified', oldValue: left, newValue: right });
    return diffs;
  }

  const leftObj = left as Record<string, unknown>;
  const rightObj = right as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(leftObj), ...Object.keys(rightObj)]);

  for (const key of allKeys) {
    const childPath = `${path}.${key}`;
    const inLeft = key in leftObj;
    const inRight = key in rightObj;

    if (inLeft && !inRight) {
      diffs.push({ path: childPath, type: 'removed', oldValue: leftObj[key] });
    } else if (!inLeft && inRight) {
      diffs.push({ path: childPath, type: 'added', newValue: rightObj[key] });
    } else {
      diffs.push(...diffJson(leftObj[key], rightObj[key], childPath));
    }
  }

  return diffs;
}
