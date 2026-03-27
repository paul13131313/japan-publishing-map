import { supabase } from '@/lib/supabase';
import { NDC_CATEGORIES } from '@/lib/constants';
import Header from '@/components/Header';
import HeroStats from '@/components/HeroStats';
import TreeMapChart from '@/components/TreeMap';
import MonthlyChart from '@/components/MonthlyChart';
import PublisherRanking from '@/components/PublisherRanking';
import { BookList } from '@/components/BookCard';

// ISR: 1時間ごとに再生成
export const revalidate = 3600;

async function getLatestMonth() {
  const { data } = await supabase
    .from('monthly_stats')
    .select('year, month')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    return { year: data[0].year, month: data[0].month };
  }

  // monthly_statsにデータがない場合、booksテーブルから最新を取得
  const { data: bookData } = await supabase
    .from('books')
    .select('issued_year, issued_month')
    .not('issued_year', 'is', null)
    .not('issued_month', 'is', null)
    .order('issued_year', { ascending: false })
    .order('issued_month', { ascending: false })
    .limit(1);

  if (bookData && bookData.length > 0) {
    return { year: bookData[0].issued_year, month: bookData[0].issued_month };
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

async function getCategoryStats(year: number, month: number) {
  // まずmonthly_statsから取得を試みる
  const { data: statsData } = await supabase
    .from('monthly_stats')
    .select('*')
    .eq('year', year)
    .eq('month', month);

  if (statsData && statsData.length > 0) {
    return statsData.map((s) => ({
      ndcMajor: s.ndc_major,
      count: s.count,
      topPublishers: s.top_publishers ?? [],
      topKeywords: s.top_keywords ?? [],
    }));
  }

  // monthly_statsにない場合、booksテーブルから直接集計
  const categories = [];
  for (let i = 0; i <= 9; i++) {
    const ndcMajor = String(i);
    const { count } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('ndc_major', ndcMajor)
      .eq('issued_year', year)
      .eq('issued_month', month);

    categories.push({
      ndcMajor,
      count: count ?? 0,
      topPublishers: [],
      topKeywords: [],
    });
  }
  return categories;
}

async function getMonthlyTrend() {
  // booksテーブルから集計
  const { data: bookData } = await supabase
    .from('books')
    .select('issued_year, issued_month, ndc_major')
    .not('issued_year', 'is', null)
    .not('issued_month', 'is', null)
    .not('ndc_major', 'is', null);

  if (!bookData || bookData.length === 0) return [];

  const monthMap = new Map<string, Record<string, number>>();
  for (const book of bookData) {
    const key = `${book.issued_year}-${String(book.issued_month).padStart(2, '0')}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, {});
    }
    const ndcKey = `ndc_${book.ndc_major}`;
    monthMap.get(key)![ndcKey] = (monthMap.get(key)![ndcKey] ?? 0) + 1;
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, ndcCounts]) => {
      const [y, m] = yearMonth.split('-');
      return {
        yearMonth,
        label: `${parseInt(y)}/${parseInt(m)}`,
        ...ndcCounts,
      };
    });
}

async function getPublisherRanking(year: number, month: number) {
  const { data } = await supabase
    .from('books')
    .select('publisher')
    .eq('issued_year', year)
    .eq('issued_month', month)
    .not('publisher', 'is', null);

  if (!data) return [];

  const counts = new Map<string, number>();
  for (const book of data) {
    if (book.publisher) {
      counts.set(book.publisher, (counts.get(book.publisher) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }));
}

async function getLatestBooks(year: number, month: number) {
  const { data } = await supabase
    .from('books')
    .select('title, creator, publisher, ndc_major, isbn, issued_date')
    .eq('issued_year', year)
    .eq('issued_month', month)
    .not('isbn', 'is', null)
    .order('harvested_at', { ascending: false })
    .limit(20);

  return (data ?? []).map((b) => ({
    title: b.title,
    creator: b.creator,
    publisher: b.publisher,
    ndcMajor: b.ndc_major,
    isbn: b.isbn,
    issuedDate: b.issued_date,
  }));
}

export default async function Home() {
  const { year, month } = await getLatestMonth();
  const [categories, monthlyTrend, publishers, latestBooks] = await Promise.all([
    getCategoryStats(year, month),
    getMonthlyTrend(),
    getPublisherRanking(year, month),
    getLatestBooks(year, month),
  ]);

  const totalBooks = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <>
      <Header totalBooks={totalBooks} currentYear={year} currentMonth={month} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1">
        {/* ヒーロー数値 */}
        <HeroStats
          totalBooks={totalBooks}
          categories={categories}
          currentYear={year}
          currentMonth={month}
        />

        {/* NDCツリーマップ */}
        <TreeMapChart data={categories} />

        {/* 月別推移グラフ */}
        <MonthlyChart data={monthlyTrend} />

        {/* 出版社ランキング */}
        <PublisherRanking data={publishers} />

        {/* 新着書籍 */}
        <BookList books={latestBooks} />

        {/* フッター */}
        <footer className="text-center text-xs text-gray-600 py-8 border-t border-[var(--card-border)]">
          <p>
            データソース:{' '}
            <a
              href="https://ndlsearch.ndl.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-300 underline"
            >
              国立国会図書館サーチ
            </a>
            {' '}OpenSearch API
          </p>
          <p className="mt-1">
            ※コミック(NDC726)は月間上位500件を収録
          </p>
          <p className="mt-2 text-gray-700">
            {Object.entries(NDC_CATEGORIES).map(([key, cat]) => (
              <span key={key} className="inline-block mr-3">
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </span>
            ))}
          </p>
        </footer>
      </main>
    </>
  );
}
