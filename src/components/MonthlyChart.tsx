'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { NDC_CATEGORIES } from '@/lib/constants';

interface MonthlyData {
  yearMonth: string; // 'YYYY-MM'
  label: string; // '3月' 等
  [ndcKey: string]: string | number; // 'ndc_0', 'ndc_1', ...
}

interface MonthlyChartProps {
  data: MonthlyData[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  const total = payload.reduce((sum: number, p: { value: number }) => sum + (p.value || 0), 0);
  return (
    <div className="bg-[#1a1a24] border border-[var(--card-border)] rounded-lg px-4 py-3 shadow-xl max-w-[200px]">
      <p className="font-bold text-sm mb-2">{label}</p>
      <p className="text-gray-300 text-xs mb-2">合計: {total.toLocaleString()}件</p>
      {payload
        .filter((p: { value: number }) => p.value > 0)
        .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
        .map((p: { name: string; value: number; color: string }) => (
          <div key={p.name} className="flex justify-between text-xs text-gray-400 gap-2">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="tabular-nums">{p.value.toLocaleString()}</span>
          </div>
        ))}
    </div>
  );
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <h2 className="text-lg font-bold font-[family-name:var(--font-noto-serif)] mb-4">
          月別推移
        </h2>
        <p className="text-gray-500 text-sm">データが不足しています（2ヶ月以上必要）</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 sm:p-6">
      <h2 className="text-lg font-bold font-[family-name:var(--font-noto-serif)] mb-4">
        月別推移
      </h2>
      <div className="h-[300px] sm:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#666' }} />
            <YAxis tick={{ fontSize: 12, fill: '#666' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value: string) => <span className="text-gray-400">{value}</span>}
            />
            {Object.entries(NDC_CATEGORIES).map(([key, cat]) => (
              <Area
                key={key}
                type="monotone"
                dataKey={`ndc_${key}`}
                name={cat.name}
                stackId="1"
                fill={cat.color}
                stroke={cat.color}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
