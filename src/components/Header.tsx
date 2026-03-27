'use client';

interface HeaderProps {
  totalBooks: number;
  currentYear: number;
  currentMonth: number;
}

export default function Header({ totalBooks, currentYear, currentMonth }: HeaderProps) {
  return (
    <header className="border-b border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-noto-serif)] tracking-tight">
              日本の出版マップ
            </h1>
            <p className="text-sm text-gray-500 mt-1 tracking-widest uppercase">
              Japan Publishing Map
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="tabular-nums">
              {currentYear}年{currentMonth}月
            </span>
            <span className="text-gray-600">|</span>
            <span className="tabular-nums">
              {totalBooks.toLocaleString()}件
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
