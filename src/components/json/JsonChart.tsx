import { useMemo, useState } from 'react';
import { useJsonStore } from '@/stores/jsonStore';
import { detectChartableKeys } from '@/utils/jsonUtils';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart3, LineChartIcon, PieChartIcon } from 'lucide-react';

type ChartType = 'bar' | 'line' | 'pie';

const CHART_COLORS = [
  'hsl(158, 54%, 32%)',
  'hsl(220, 70%, 50%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(280, 60%, 50%)',
  'hsl(180, 60%, 40%)',
];

export default function JsonChart() {
  const { parsedJson } = useJsonStore();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xKey, setXKey] = useState<string>('');
  const [yKeys, setYKeys] = useState<string[]>([]);

  const { labels, numeric } = useMemo(
    () => detectChartableKeys(parsedJson),
    [parsedJson]
  );

  // Auto-select keys on first detect
  useMemo(() => {
    if (labels.length > 0 && !xKey) setXKey(labels[0]);
    if (numeric.length > 0 && yKeys.length === 0) setYKeys([numeric[0]]);
  }, [labels, numeric]);

  const data = useMemo(() => {
    if (!Array.isArray(parsedJson)) return [];
    return parsedJson as Record<string, unknown>[];
  }, [parsedJson]);

  const isChartable = labels.length > 0 && numeric.length > 0 && data.length > 0;

  const chartTypes: { type: ChartType; icon: typeof BarChart3; label: string }[] = [
    { type: 'bar', icon: BarChart3, label: 'Bar' },
    { type: 'line', icon: LineChartIcon, label: 'Line' },
    { type: 'pie', icon: PieChartIcon, label: 'Pie' },
  ];

  if (!isChartable) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 p-6">
        <BarChart3 className="w-10 h-10 opacity-30" />
        <p className="font-medium">No chartable data detected</p>
        <p className="text-xs text-center max-w-sm">
          Load a JSON array of objects with string labels and numeric values.
          <br />{'Example: [{"name": "Jan", "value": 42}, ...]'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Config bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b surface-1 flex-wrap">
        {/* Chart type */}
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted">
          {chartTypes.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                chartType === type
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* X axis */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">X:</span>
          <select
            value={xKey}
            onChange={(e) => setXKey(e.target.value)}
            className="bg-muted rounded px-2 py-1 text-xs outline-none"
          >
            {labels.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        {/* Y axis */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Y:</span>
          {numeric.map((k) => (
            <label key={k} className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={yKeys.includes(k)}
                onChange={(e) => {
                  if (e.target.checked) setYKeys([...yKeys, k]);
                  else setYKeys(yKeys.filter((y) => y !== k));
                }}
                className="rounded border-border"
              />
              <span>{k}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 p-6 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              {yKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              {yKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          ) : (
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              <Pie
                data={data}
                dataKey={yKeys[0] || numeric[0]}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius="70%"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
