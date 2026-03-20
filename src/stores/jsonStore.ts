import { create } from 'zustand';

export type JsonTab = 'viewer' | 'graph' | 'diff' | 'schema' | 'types';

interface JsonState {
  // Main JSON
  rawInput: string;
  parsedJson: unknown | null;
  parseError: string | null;
  
  // Diff
  diffLeft: string;
  diffRight: string;
  parsedDiffLeft: unknown | null;
  parsedDiffRight: unknown | null;
  
  // UI
  activeTab: JsonTab;
  expandedPaths: Set<string>;
  searchQuery: string;
  searchMatches: string[];
  
  // Actions
  setRawInput: (input: string) => void;
  setActiveTab: (tab: JsonTab) => void;
  togglePath: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setSearchQuery: (query: string) => void;
  setSearchMatches: (matches: string[]) => void;
  setDiffLeft: (input: string) => void;
  setDiffRight: (input: string) => void;
}

function tryParse(input: string): { data: unknown | null; error: string | null } {
  if (!input.trim()) return { data: null, error: null };
  try {
    return { data: JSON.parse(input), error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

function collectAllPaths(obj: unknown, prefix = ''): string[] {
  const paths: string[] = [];
  if (obj && typeof obj === 'object') {
    paths.push(prefix || '$');
    const entries = Array.isArray(obj)
      ? obj.map((_, i) => [String(i), obj[i]] as const)
      : Object.entries(obj as Record<string, unknown>);
    for (const [key, value] of entries) {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(...collectAllPaths(value, path));
    }
  }
  return paths;
}

export const useJsonStore = create<JsonState>((set, get) => ({
  rawInput: '',
  parsedJson: null,
  parseError: null,
  diffLeft: '',
  diffRight: '',
  parsedDiffLeft: null,
  parsedDiffRight: null,
  activeTab: 'viewer' as JsonTab,
  expandedPaths: new Set<string>(),
  searchQuery: '',
  searchMatches: [],

  setRawInput: (input) => {
    const { data, error } = tryParse(input);
    set({ rawInput: input, parsedJson: data, parseError: error });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  togglePath: (path) => {
    const expanded = new Set(get().expandedPaths);
    if (expanded.has(path)) expanded.delete(path);
    else expanded.add(path);
    set({ expandedPaths: expanded });
  },

  expandAll: () => {
    const { parsedJson } = get();
    if (!parsedJson) return;
    const allPaths = collectAllPaths(parsedJson);
    set({ expandedPaths: new Set(allPaths) });
  },

  collapseAll: () => set({ expandedPaths: new Set() }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchMatches: (matches) => set({ searchMatches: matches }),

  setDiffLeft: (input) => {
    const { data } = tryParse(input);
    set({ diffLeft: input, parsedDiffLeft: data });
  },

  setDiffRight: (input) => {
    const { data } = tryParse(input);
    set({ diffRight: input, parsedDiffRight: data });
  },
}));
