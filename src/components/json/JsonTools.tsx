import { useCallback } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { flattenJson, jsonToCsv, sortJsonKeys } from '@/utils/jsonUtils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlignLeft, Minimize2, GitFork, FileSpreadsheet, ArrowDownAZ, Copy, Download } from 'lucide-react';

export default function JsonTools() {
  const { parsedJson, rawInput, setRawInput } = useJsonStore();

  const prettyPrint = useCallback(() => {
    if (!parsedJson) return;
    setRawInput(JSON.stringify(parsedJson, null, 2));
    toast.success('Formatted JSON');
  }, [parsedJson, setRawInput]);

  const minify = useCallback(() => {
    if (!parsedJson) return;
    setRawInput(JSON.stringify(parsedJson));
    toast.success('Minified JSON');
  }, [parsedJson, setRawInput]);

  const flatten = useCallback(() => {
    if (!parsedJson) return;
    const flat = flattenJson(parsedJson);
    setRawInput(JSON.stringify(flat, null, 2));
    toast.success('Flattened JSON');
  }, [parsedJson, setRawInput]);

  const convertToCsv = useCallback(() => {
    if (!parsedJson) return;
    const csv = jsonToCsv(parsedJson);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded CSV');
  }, [parsedJson]);

  const sortKeys = useCallback(() => {
    if (!parsedJson) return;
    const sorted = sortJsonKeys(parsedJson);
    setRawInput(JSON.stringify(sorted, null, 2));
    toast.success('Sorted keys alphabetically');
  }, [parsedJson, setRawInput]);

  const copyAll = useCallback(() => {
    navigator.clipboard.writeText(rawInput);
    toast.success('Copied to clipboard');
  }, [rawInput]);

  const downloadJson = useCallback(() => {
    const blob = new Blob([rawInput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded JSON');
  }, [rawInput]);

  const disabled = !parsedJson;

  const tools = [
    { icon: AlignLeft, label: 'Pretty Print', desc: 'Format with 2-space indentation', action: prettyPrint },
    { icon: Minimize2, label: 'Minify', desc: 'Remove all whitespace', action: minify },
    { icon: GitFork, label: 'Flatten', desc: 'Convert nested structure to dot-notation', action: flatten },
    { icon: FileSpreadsheet, label: 'Export CSV', desc: 'Convert array of objects to CSV file', action: convertToCsv },
    { icon: ArrowDownAZ, label: 'Sort Keys', desc: 'Alphabetically sort all object keys', action: sortKeys },
    { icon: Copy, label: 'Copy All', desc: 'Copy entire JSON to clipboard', action: copyAll },
    { icon: Download, label: 'Download', desc: 'Save as .json file', action: downloadJson },
  ];

  return (
    <div className="p-6 overflow-auto scrollbar-thin">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
        {tools.map(({ icon: Icon, label, desc, action }) => (
          <button
            key={label}
            onClick={action}
            disabled={disabled}
            className="group flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 hover:shadow-sm transition-all duration-200 text-left disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <div className="p-2 rounded-md surface-2 group-hover:bg-primary/10 transition-colors">
              <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
            </div>
          </button>
        ))}
      </div>

      {!parsedJson && (
        <p className="text-sm text-muted-foreground mt-6">
          Load valid JSON in the Viewer tab to use these tools.
        </p>
      )}
    </div>
  );
}
