import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchNdlBooks } from '@/lib/ndl';
import { NDC_HARVEST_QUERIES } from '@/lib/constants';
import { ParsedBook } from '@/lib/parser';

/**
 * 日次ハーベスト API Route
 * Vercel Cron から毎日呼び出される
 * 当月 + 前月のデータを取得してSupabaseにUPSERT
 */
export async function GET(request: NextRequest) {
  // Cron認証チェック
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const targetMonths = getTargetMonths(now);

  const results: HarvestResult[] = [];

  for (const month of targetMonths) {
    for (const ndcQuery of NDC_HARVEST_QUERIES) {
      try {
        const result = await harvestSingle(ndcQuery, month);
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          ndcQuery,
          targetMonth: month,
          totalResults: 0,
          fetchedCount: 0,
          newCount: 0,
          status: 'error',
          errorMessage,
        });

        // エラーログをDBにも記録
        await supabase.from('harvest_logs').insert({
          ndc_query: ndcQuery,
          target_month: month,
          total_results: 0,
          fetched_count: 0,
          new_count: 0,
          status: 'error',
          error_message: errorMessage,
        });
      }
    }
  }

  const summary = {
    executedAt: now.toISOString(),
    targetMonths,
    totalQueries: results.length,
    successCount: results.filter((r) => r.status === 'success').length,
    errorCount: results.filter((r) => r.status === 'error').length,
    totalNewBooks: results.reduce((sum, r) => sum + r.newCount, 0),
    results,
  };

  return Response.json(summary);
}

interface HarvestResult {
  ndcQuery: string;
  targetMonth: string;
  totalResults: number;
  fetchedCount: number;
  newCount: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

/**
 * 1クエリ分のハーベスト処理
 */
async function harvestSingle(
  ndcQuery: string,
  targetMonth: string,
): Promise<HarvestResult> {
  const { totalResults, books } = await fetchNdlBooks(
    ndcQuery,
    targetMonth,
    targetMonth,
  );

  let newCount = 0;

  if (books.length > 0) {
    newCount = await upsertBooks(books);
  }

  // ログ記録
  await supabase.from('harvest_logs').insert({
    ndc_query: ndcQuery,
    target_month: targetMonth,
    total_results: totalResults,
    fetched_count: books.length,
    new_count: newCount,
    status: 'success',
  });

  return {
    ndcQuery,
    targetMonth,
    totalResults,
    fetchedCount: books.length,
    newCount,
    status: 'success',
  };
}

/**
 * 書誌データをSupabaseにUPSERT（ndl_bib_id で重複排除）
 */
async function upsertBooks(books: ParsedBook[]): Promise<number> {
  const rows = books.map((book) => ({
    ndl_bib_id: book.ndlBibId,
    title: book.title,
    creator: book.creator,
    publisher: book.publisher,
    ndc: book.ndc,
    ndc_major: book.ndcMajor,
    ndc_mid: book.ndcMid,
    issued_date: book.issuedDate,
    issued_year: book.issuedYear,
    issued_month: book.issuedMonth,
    isbn: book.isbn,
    price: book.price,
    material_type: book.materialType,
  }));

  // 100件ずつバッチでUPSERT
  let newCount = 0;
  const batchSize = 100;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('books')
      .upsert(batch, {
        onConflict: 'ndl_bib_id',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      throw new Error(`Supabase upsert error: ${error.message}`);
    }

    newCount += data?.length ?? 0;
  }

  return newCount;
}

/**
 * 当月と前月のYYYY-MM文字列を返す
 */
function getTargetMonths(now: Date): string[] {
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  const currentMonth = `${year}-${String(month).padStart(2, '0')}`;

  // 前月
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const previousMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  return [currentMonth, previousMonth];
}
