'use client';

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { NDC_CATEGORIES } from '@/lib/constants';

interface TreeMapData {
  ndcMajor: string;
  count: number;
}

interface TreeMapProps {
  data: TreeMapData[];
}

interface TreeMapNodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  icon: string;
  count: number;
  color: string;
}

function CustomContent(props: TreeMapNodeProps) {
  const { x, y, width, height, name, icon, count, color } = props;
  const isSmall = width < 80 || height < 60;
  const isTiny = width < 50 || height < 40;

  if (isTiny) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={color} opacity={0.85} rx={4} stroke="#0a0a0f" strokeWidth={2} />
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={14}>
          {icon}
        </text>
      </g>
    );
  }

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} opacity={0.85} rx={4} stroke="#0a0a0f" strokeWidth={2} />
      <text x={x + width / 2} y={y + height / 2 - (isSmall ? 8 : 14)} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={isSmall ? 18 : 24}>
        {icon}
      </text>
      <text x={x + width / 2} y={y + height / 2 + (isSmall ? 8 : 10)} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={isSmall ? 11 : 13} fontWeight="bold">
        {name}
      </text>
      {!isSmall && (
        <text x={x + width / 2} y={y + height / 2 + 28} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.7)" fontSize={11}>
          {count.toLocaleString()}件
        </text>
      )}
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1a1a24] border border-[var(--card-border)] rounded-lg px-3 py-2 shadow-xl">
      <p className="font-bold text-sm">{d.icon} {d.name}</p>
      <p className="text-gray-400 text-xs mt-1">{d.count.toLocaleString()}件</p>
    </div>
  );
}

export default function TreeMapChart({ data }: TreeMapProps) {
  const treeData = data
    .filter((d) => d.count > 0)
    .map((d) => {
      const cat = NDC_CATEGORIES[d.ndcMajor as keyof typeof NDC_CATEGORIES];
      return {
        name: cat?.name ?? `NDC${d.ndcMajor}`,
        icon: cat?.icon ?? '📖',
        count: d.count,
        color: cat?.color ?? '#666',
      };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 sm:p-6">
      <h2 className="text-lg font-bold font-[family-name:var(--font-noto-serif)] mb-4">
        NDC分類ツリーマップ
      </h2>
      <div className="h-[300px] sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treeData}
            dataKey="count"
            aspectRatio={4 / 3}
            content={<CustomContent x={0} y={0} width={0} height={0} name="" icon="" count={0} color="" />}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
