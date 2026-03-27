import { loadDefaultJapaneseParser } from 'budoux';

const budouxParser = loadDefaultJapaneseParser();

// 除外するストップワード
const STOP_WORDS = new Set([
  // 一般的すぎる語
  '日本', '入門', '新版', '改訂', '増補', '第', '版', '編',
  '上', '下', '巻', '集', '号', '年', '月', '著', '訳', '監修',
  // 助詞・助動詞的
  'の', 'に', 'は', 'を', 'が', 'で', 'と', 'も', 'から', 'まで',
  'より', 'へ', 'や', 'か', 'な', 'よ', 'ね', 'わ',
  'する', 'ある', 'いる', 'なる', 'れる', 'られる',
  'こと', 'もの', 'ため', 'よう', 'ところ',
  // 出版関連
  '完全', 'ガイド', 'ブック', 'シリーズ',
  '最新', '決定', '保存', '永久',
  // 短すぎる語（1文字）
]);

/**
 * タイトル群からキーワードを抽出してカウント
 */
export function extractKeywords(titles: string[]): Map<string, number> {
  const wordCounts = new Map<string, number>();

  for (const title of titles) {
    const words = budouxParser.parse(title);

    for (const word of words) {
      const trimmed = word.trim();

      // 1文字以下はスキップ
      if (trimmed.length <= 1) continue;
      // 数字のみはスキップ
      if (/^\d+$/.test(trimmed)) continue;
      // ストップワードはスキップ
      if (STOP_WORDS.has(trimmed)) continue;

      wordCounts.set(trimmed, (wordCounts.get(trimmed) ?? 0) + 1);
    }
  }

  return wordCounts;
}

/**
 * キーワードカウントを上位N件の配列に変換
 */
export function getTopKeywords(
  wordCounts: Map<string, number>,
  limit: number = 20,
): { word: string; count: number }[] {
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}
