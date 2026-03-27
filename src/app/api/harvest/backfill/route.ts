import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchNdlBooks } from '@/lib/ndl';
import { NDC_HARVEST_QUERIES, HARVEST_CONFIG } from '@/lib/constants';
import { ParsedBook } from '@/lib/parser';

/**
 * バックフィル API Route
 * 2024年1月〜現在までの過去データを一括ハーベスト
 * 手動実行用（Cronではなく直接叩く）
 *
 * クエリパラメータ:
 *   from: 開始年月 (YYYY-MM) デフォルト: 2024-01
 *   until: 終了年月 (YYYY-MM) デフォルト: 当月
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const fromParam = searchParams.get('from') ?? '2024-01';
  const untilParam = searchParams.get('until') ?? getCurrentMonth();

  // 対象月のリストを生成
  const months = generateMonthRange(fromParam, untilParam);

  const results: BackfillResult[] = [];
  let totalNew = 0;

  for (const month of months) {
    for (const ndcQuery of NDC_HARVEST_QUERIES) {
      try {
        const { totalResults, books } = await fetchNdlBooks(
          ndcQuery,
          month,
          month,
        );

        let newCount = 0;
        if (books.length > 0) {
          newCount = await upsertBooks(books);
        }

        totalNew += newCount;

        // ログ記録
        await supabase.from('harvest_logs').insert({
          ndc_query: ndcQuery,
          target_month: month,
          total_results: totalResults,
          fetched_count: books.length,
          new_count: newCount,
          status: 'success',
        });

        results.push({
          ndcQuery,
          targetMonth: month,
          totalResults,
          fetchedCount: books.length,
          newCount,
          status: 'success',
        });

        // API負荷軽減のため1秒待機
        await sleep(HARVEST_CONFIG.BACKFILL_DELAY_MS);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        await supabase.from('harvest_logs').insert({
          ndc_query: ndcQuery,
          target_month: month,
          total_results: 0,
          fetched_count: 0,
          new_count: 0,
          status: 'error',
          error_message: errorMessage,
        });

        results.push({
          ndcQuery,
          targetMonth: month,
          totalResults: 0,
          fetchedCount: 0,
          newCount: 0,
          status: 'error',
          errorMessage,
        });
      }
    }
  }

  return Response.json({
    from: fromParam,
    until: untilParam,
    totalMonths: months.length,
    totalQueries: results.length,
    totalNewBooks: totalNew,
    successCount: results.filter((r) => r.status === 'success').length,
    errorCount: results.filter((r) => r.status === 'error').length,
    results,
  });
}

interface BackfillResult {
  ndcQuery: string;
  targetMonth: string;
  totalResults: number;
  fetchedCount: number;
  newCount: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

/**
 * 書誌データをSupabaseにUPSERT
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
 * YYYY-MM の範囲を配列で返す
 */
function generateMonthRange(from: string, until: string): string[] {
  const months: string[] = [];

  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [untilYear, untilMonth] = until.split('-').map(Number);

  let year = fromYear;
  let month = fromMonth;

  while (year < untilYear || (year === untilYear && month <= untilMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
