// NDC 日本十進分類法（10大分類）
export const NDC_CATEGORIES = {
  '0': { name: '総記', nameEn: 'General', color: '#6366F1', icon: '📚' },
  '1': { name: '哲学', nameEn: 'Philosophy', color: '#8B5CF6', icon: '🤔' },
  '2': { name: '歴史', nameEn: 'History', color: '#D97706', icon: '🏛️' },
  '3': { name: '社会科学', nameEn: 'Social Science', color: '#DC2626', icon: '⚖️' },
  '4': { name: '自然科学', nameEn: 'Natural Science', color: '#059669', icon: '🔬' },
  '5': { name: '技術', nameEn: 'Technology', color: '#2563EB', icon: '⚙️' },
  '6': { name: '産業', nameEn: 'Industry', color: '#65A30D', icon: '🌾' },
  '7': { name: '芸術', nameEn: 'Arts', color: '#DB2777', icon: '🎨' },
  '8': { name: '言語', nameEn: 'Language', color: '#0891B2', icon: '💬' },
  '9': { name: '文学', nameEn: 'Literature', color: '#7C3AED', icon: '✍️' },
} as const;

// NDC 7（芸術）は月間862件で500件上限を超えるため、2桁に分割
// NDC 72（絵画・漫画）は655件で超えるが、726（漫画）として1クエリで上位500件をサンプリング
export const NDC_HARVEST_QUERIES = [
  // 1桁クエリ（NDC 7以外）
  '0', '1', '2', '3', '4', '5', '6', '8', '9',
  // NDC 7 を2桁に分割
  '70', '71', '73', '74', '75', '76', '77', '78', '79',
  // NDC 72 は漫画が多いので726だけ独立 + 残り（720-725, 727-729）
  '726',  // 漫画・挿絵（上位500件サンプリング）
  '720', '721', '722', '723', '724', '725', '727', '728', '729',
] as const;

// NDL OpenSearch API ベースURL
export const NDL_API_BASE = 'https://ndlsearch.ndl.go.jp/api/opensearch';

// NDL 書影API ベースURL
export const NDL_THUMBNAIL_BASE = 'https://ndlsearch.ndl.go.jp/thumbnail';

// ハーベスト設定
export const HARVEST_CONFIG = {
  MAX_RESULTS_PER_QUERY: 500,  // NDL APIの1クエリ最大件数
  DATA_PROVIDER_ID: 'iss-ndl-opac',  // NDL蔵書（NDC付き）
  BACKFILL_DELAY_MS: 1000,  // バックフィル時のAPI間隔（ms）
} as const;
