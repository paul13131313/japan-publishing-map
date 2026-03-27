'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PublisherData {
  name: string;
  count: number;
}

interface PublisherRankingProps {
  data: PublisherData[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1a1a24] border border-[var(--card-border)] rounded-lg px-3 py-2 shadow-xl">
      <p className="font-bold text-sm">{d.name}</p>
      <p className="text-gray-400 text-xs mt-1">{d.count.toLocaleString()}件</p>
    </div>
  );
}

export default function PublisherRanking({ data }: PublisherRankingProps) {
  const top20 = data.slice(0, 20);

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 sm:p-6">
      <h2 className="text-lg font-bold font-[family-name:var(--font-noto-serif)] mb-4">
        出版社ランキング TOP 20
      </h2>
      <div style={{ height: `${Math.max(top20.length * 28, 200)}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top20} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#666' }} />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              tick={{ fontSize: 11, fill: '#999' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
