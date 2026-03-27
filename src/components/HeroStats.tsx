'use client';

import { NDC_CATEGORIES } from '@/lib/constants';

interface CategoryCount {
  ndcMajor: string;
  count: number;
}

interface HeroStatsProps {
  totalBooks: number;
  categories: CategoryCount[];
  currentYear: number;
  currentMonth: number;
}

export default function HeroStats({
  totalBooks,
  categories,
  currentYear,
  currentMonth,
}: HeroStatsProps) {
  // 最多カテゴリ
  const topCategory = [...categories].sort((a, b) => b.count - a.count)[0];
  const topCat = topCategory
    ? NDC_CATEGORIES[topCategory.ndcMajor as keyof typeof NDC_CATEGORIES]
    : null;

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        {/* メイン数値 */}
        <div className="flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
            {currentYear}年{currentMonth}月の出版数
          </p>
          <p className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">
            {totalBooks.toLocaleString()}
            <span className="text-lg text-gray-500 ml-1">件</span>
          </p>
        </div>

        {/* サブ情報 */}
        <div className="flex gap-6 text-sm">
          {topCat && topCategory && (
            <div>
              <p className="text-xs text-gray-500 mb-1">最多カテゴリ</p>
              <p className="font-bold" style={{ color: topCat.color }}>
                {topCat.icon} {topCat.name}
              </p>
              <p className="text-xs text-gray-500 tabular-nums">
                {topCategory.count.toLocaleString()}件
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-1">分類数</p>
            <p className="font-bold">{categories.filter((c) => c.count > 0).length}</p>
            <p className="text-xs text-gray-500">カテゴリ</p>
          </div>
        </div>
      </div>

      {/* NDCミニバー */}
      <div className="mt-4 flex gap-0.5 h-2 rounded-full overflow-hidden">
        {categories
          .sort((a, b) => b.count - a.count)
          .map((c) => {
            const cat = NDC_CATEGORIES[c.ndcMajor as keyof typeof NDC_CATEGORIES];
            const pct = totalBooks > 0 ? (c.count / totalBooks) * 100 : 0;
            return (
              <div
                key={c.ndcMajor}
                style={{
                  width: `${Math.max(pct, 0.5)}%`,
                  backgroundColor: cat?.color ?? '#666',
                }}
                title={`${cat?.name}: ${c.count}件`}
              />
            );
          })}
      </div>
    </div>
  );
}
