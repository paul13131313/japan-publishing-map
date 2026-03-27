import { NDL_API_BASE, HARVEST_CONFIG } from './constants';
import { parseNdlResponse, ParsedBook } from './parser';

/**
 * NDL OpenSearch API を叩いて書誌データを取得
 * @param ndc NDC分類番号（前方一致）
 * @param fromMonth 開始年月 'YYYY-MM'
 * @param untilMonth 終了年月 'YYYY-MM'
 */
export async function fetchNdlBooks(
  ndc: string,
  fromMonth: string,
  untilMonth: string,
): Promise<{
  totalResults: number;
  books: ParsedBook[];
}> {
  const params = new URLSearchParams({
    dpid: HARVEST_CONFIG.DATA_PROVIDER_ID,
    ndc: ndc,
    from: fromMonth,
    until: untilMonth,
    cnt: HARVEST_CONFIG.MAX_RESULTS_PER_QUERY.toString(),
    idx: '1',
  });

  const url = `${NDL_API_BASE}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`NDL API error: ${response.status} ${response.statusText} (URL: ${url})`);
  }

  const xml = await response.text();
  return parseNdlResponse(xml);
}

/**
 * ISBN から書影URLを生成
 * 画像がない場合は404になるので、フロントで対処が必要
 */
export function getThumbnailUrl(isbn: string | null): string | null {
  if (!isbn) return null;
  const cleaned = isbn.replace(/-/g, '');
  return `https://ndlsearch.ndl.go.jp/thumbnail/${cleaned}.jpg`;
}
