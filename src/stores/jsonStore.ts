import { create } from 'zustand';

export type JsonTab = 'viewer' | 'graph' | 'diff' | 'schema' | 'types' | 'flatten' | 'toon';

const WORKSPACE_STORAGE_KEY = 'json-lens-workspace-v1';
const MAX_RECENT_ITEMS = 10;
const MAX_SAVED_ITEMS = 10;

export interface WorkspaceItem {
  id: string;
  title: string;
  raw: string;
  bytes: number;
  updatedAt: number;
}

interface WorkspaceStorage {
  recentItems: WorkspaceItem[];
  savedItems: WorkspaceItem[];
  shelfSeen: boolean;
}

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

  // Workspace shelf
  recentItems: WorkspaceItem[];
  savedItems: WorkspaceItem[];
  shelfSeen: boolean;

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
  addRecentItem: (raw: string) => void;
  saveCurrentJson: (title?: string) => boolean;
  loadWorkspaceItem: (source: 'recent' | 'saved', id: string) => boolean;
  removeWorkspaceItem: (source: 'recent' | 'saved', id: string) => void;
  pinRecentItem: (id: string, title?: string) => boolean;
  markShelfSeen: () => void;
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

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function getByteSize(raw: string): number {
  return new TextEncoder().encode(raw).length;
}

function deriveTitle(input: string, value: unknown, explicitTitle?: string): string {
  if (explicitTitle?.trim()) return explicitTitle.trim();
  if (Array.isArray(value)) return `Array (${value.length})`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) return 'Empty object';
    if (keys.length === 1) return keys[0];
    return `${keys.slice(0, 2).join(', ')}${keys.length > 2 ? ` +${keys.length - 2}` : ''}`;
  }
  if (typeof value === 'string') return value.slice(0, 24) || 'String value';
  if (typeof value === 'number') return `Number ${value}`;
  if (typeof value === 'boolean') return value ? 'Boolean true' : 'Boolean false';
  if (value === null) return 'Null value';
  return input.trim().slice(0, 24) || 'JSON snippet';
}

function createWorkspaceItem(raw: string, value: unknown, explicitTitle?: string): WorkspaceItem {
  return {
    id: crypto.randomUUID(),
    title: deriveTitle(raw, value, explicitTitle),
    raw,
    bytes: getByteSize(raw),
    updatedAt: Date.now(),
  };
}

function upsertWorkspaceItem(
  items: WorkspaceItem[],
  item: WorkspaceItem,
  limit: number,
): WorkspaceItem[] {
  const existing = items.find((entry) => entry.raw === item.raw);
  const nextItem = existing
    ? { ...existing, ...item, id: existing.id, updatedAt: Date.now() }
    : item;
  return [nextItem, ...items.filter((entry) => entry.id !== nextItem.id)].slice(0, limit);
}

function readWorkspaceStorage(): WorkspaceStorage {
  if (!canUseStorage()) return { recentItems: [], savedItems: [], shelfSeen: false };
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return { recentItems: [], savedItems: [], shelfSeen: false };
    const parsed = JSON.parse(raw) as Partial<WorkspaceStorage>;
    return {
      recentItems: Array.isArray(parsed.recentItems) ? parsed.recentItems : [],
      savedItems: Array.isArray(parsed.savedItems) ? parsed.savedItems : [],
      shelfSeen: Boolean(parsed.shelfSeen),
    };
  } catch {
    return { recentItems: [], savedItems: [], shelfSeen: false };
  }
}

function writeWorkspaceStorage(data: WorkspaceStorage): void {
  if (!canUseStorage()) return;
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(data));
}

const initialWorkspace = readWorkspaceStorage();

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
  recentItems: initialWorkspace.recentItems,
  savedItems: initialWorkspace.savedItems,
  shelfSeen: initialWorkspace.shelfSeen,

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

  addRecentItem: (raw) => {
    const { data, error } = tryParse(raw);
    if (!raw.trim() || error || data === null) return;
    set((state) => {
      const recentItems = upsertWorkspaceItem(
        state.recentItems,
        createWorkspaceItem(raw, data),
        MAX_RECENT_ITEMS,
      );
      writeWorkspaceStorage({
        recentItems,
        savedItems: state.savedItems,
        shelfSeen: state.shelfSeen,
      });
      return { recentItems };
    });
  },

  saveCurrentJson: (title) => {
    const { rawInput, parsedJson, parseError } = get();
    if (!rawInput.trim() || parseError || parsedJson === null) return false;
    set((state) => {
      const savedItems = upsertWorkspaceItem(
        state.savedItems,
        createWorkspaceItem(rawInput, parsedJson, title),
        MAX_SAVED_ITEMS,
      );
      writeWorkspaceStorage({
        recentItems: state.recentItems,
        savedItems,
        shelfSeen: true,
      });
      return { savedItems, shelfSeen: true };
    });
    return true;
  },

  loadWorkspaceItem: (source, id) => {
    const state = get();
    const list = source === 'recent' ? state.recentItems : state.savedItems;
    const item = list.find((entry) => entry.id === id);
    if (!item) return false;
    const { data, error } = tryParse(item.raw);
    set((current) => {
      const recentItems = error || data === null
        ? current.recentItems
        : upsertWorkspaceItem(
            current.recentItems,
            createWorkspaceItem(item.raw, data, item.title),
            MAX_RECENT_ITEMS,
          );
      writeWorkspaceStorage({
        recentItems,
        savedItems: current.savedItems,
        shelfSeen: current.shelfSeen,
      });
      return {
        rawInput: item.raw,
        parsedJson: data,
        parseError: error,
        recentItems,
      };
    });
    return true;
  },

  removeWorkspaceItem: (source, id) => {
    set((state) => {
      const recentItems =
        source === 'recent'
          ? state.recentItems.filter((entry) => entry.id !== id)
          : state.recentItems;
      const savedItems =
        source === 'saved'
          ? state.savedItems.filter((entry) => entry.id !== id)
          : state.savedItems;
      writeWorkspaceStorage({ recentItems, savedItems, shelfSeen: state.shelfSeen });
      return { recentItems, savedItems };
    });
  },

  pinRecentItem: (id, title) => {
    const { recentItems } = get();
    const item = recentItems.find((entry) => entry.id === id);
    if (!item) return false;
    const { data, error } = tryParse(item.raw);
    if (error || data === null) return false;
    set((state) => {
      const savedItems = upsertWorkspaceItem(
        state.savedItems,
        createWorkspaceItem(item.raw, data, title || item.title),
        MAX_SAVED_ITEMS,
      );
      writeWorkspaceStorage({
        recentItems: state.recentItems,
        savedItems,
        shelfSeen: true,
      });
      return { savedItems, shelfSeen: true };
    });
    return true;
  },

  markShelfSeen: () => {
    set((state) => {
      if (state.shelfSeen) return state;
      writeWorkspaceStorage({
        recentItems: state.recentItems,
        savedItems: state.savedItems,
        shelfSeen: true,
      });
      return { shelfSeen: true };
    });
  },
}));
