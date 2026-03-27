import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractKeywords, getTopKeywords } from '@/lib/keywords';

/**
 * 月次集計 API Route
 * books テーブルから対象月のデータを集計し monthly_stats にUPSERT
 *
 * クエリパラメータ:
 *   year: 対象年（デフォルト: 当年）
 *   month: 対象月（デフォルト: 前月）
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const now = new Date();

  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1), 10);

  const results = [];

  // NDC大分類ごとに集計
  for (let ndc = 0; ndc <= 9; ndc++) {
    const ndcMajor = String(ndc);

    // 件数カウント
    const { count, error: countError } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('ndc_major', ndcMajor)
      .eq('issued_year', year)
      .eq('issued_month', month);

    if (countError) {
      throw new Error(`Count error for NDC ${ndcMajor}: ${countError.message}`);
    }

    // 出版社ランキング TOP 10
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('publisher, title')
      .eq('ndc_major', ndcMajor)
      .eq('issued_year', year)
      .eq('issued_month', month);

    if (booksError) {
      throw new Error(`Books query error for NDC ${ndcMajor}: ${booksError.message}`);
    }

    // 出版社カウント
    const publisherCounts = new Map<string, number>();
    const titles: string[] = [];

    for (const book of books ?? []) {
      if (book.publisher) {
        publisherCounts.set(
          book.publisher,
          (publisherCounts.get(book.publisher) ?? 0) + 1,
        );
      }
      if (book.title) {
        titles.push(book.title);
      }
    }

    const topPublishers = Array.from(publisherCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // キーワード抽出
    const wordCounts = extractKeywords(titles);
    const topKeywords = getTopKeywords(wordCounts, 20);

    // monthly_stats にUPSERT
    const { error: upsertError } = await supabase
      .from('monthly_stats')
      .upsert(
        {
          year,
          month,
          ndc_major: ndcMajor,
          count: count ?? 0,
          top_publishers: topPublishers,
          top_keywords: topKeywords,
        },
        { onConflict: 'year,month,ndc_major' },
      );

    if (upsertError) {
      throw new Error(`Upsert error for NDC ${ndcMajor}: ${upsertError.message}`);
    }

    results.push({
      ndcMajor,
      count: count ?? 0,
      topPublishers: topPublishers.slice(0, 3),
      topKeywords: topKeywords.slice(0, 5),
    });
  }

  return Response.json({
    year,
    month,
    totalBooks: results.reduce((sum, r) => sum + r.count, 0),
    categories: results,
  });
}
