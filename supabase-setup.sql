-- ============================================
-- japan-publishing-map テーブル作成SQL
-- Supabase SQL Editor で実行してください
-- ============================================

-- 書誌データ
CREATE TABLE books (
  id BIGSERIAL PRIMARY KEY,
  ndl_bib_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  creator TEXT,
  publisher TEXT,
  ndc TEXT,
  ndc_major CHAR(1),
  ndc_mid CHAR(2),
  issued_date TEXT,
  issued_year INT,
  issued_month INT,
  isbn TEXT,
  price TEXT,
  material_type TEXT,
  harvested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_books_ndc_major ON books(ndc_major);
CREATE INDEX idx_books_ndc_mid ON books(ndc_mid);
CREATE INDEX idx_books_issued ON books(issued_year, issued_month);
CREATE INDEX idx_books_publisher ON books(publisher);
CREATE INDEX idx_books_harvested ON books(harvested_at);

-- 月次集計キャッシュ
CREATE TABLE monthly_stats (
  id BIGSERIAL PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  ndc_major CHAR(1) NOT NULL,
  count INT NOT NULL,
  top_publishers JSONB,
  top_keywords JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month, ndc_major)
);

-- AIトレンドサマリー
CREATE TABLE trend_summaries (
  id BIGSERIAL PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  summary_text TEXT NOT NULL,
  highlights JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month)
);

-- ハーベスト実行ログ
CREATE TABLE harvest_logs (
  id BIGSERIAL PRIMARY KEY,
  ndc_query TEXT NOT NULL,
  target_month TEXT NOT NULL,
  total_results INT,
  fetched_count INT,
  new_count INT,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
