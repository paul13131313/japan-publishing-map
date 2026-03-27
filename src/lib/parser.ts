import { XMLParser } from 'fast-xml-parser';

// NDL OpenSearch APIのXMLレスポンスから書誌データを抽出する

export interface ParsedBook {
  ndlBibId: string;
  title: string;
  creator: string | null;
  publisher: string | null;
  ndc: string | null;
  ndcMajor: string | null;  // 0-9
  ndcMid: string | null;    // 00-99
  issuedDate: string | null; // '2026.3' 等
  issuedYear: number | null;
  issuedMonth: number | null;
  isbn: string | null;
  price: string | null;
  materialType: string | null;
}

interface RssItem {
  'dc:title'?: string | string[];
  'dc:creator'?: string | string[];
  'dc:publisher'?: string | string[];
  'dc:subject'?: SubjectEntry | SubjectEntry[];
  'dcterms:issued'?: string;
  'dc:identifier'?: IdentifierEntry | IdentifierEntry[];
  'dcndl:price'?: string;
  'category'?: string;
}

interface SubjectEntry {
  '#text'?: string;
  '@_xsi:type'?: string;
}

interface IdentifierEntry {
  '#text'?: string;
  '@_xsi:type'?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // 数値変換を無効化（NDC '007.35' が '7.35' に、BibID '034572488' が '34572488' になるのを防ぐ）
  parseTagValue: false,
  isArray: (name) => {
    // これらのフィールドは複数存在しうるので常に配列として扱う
    return ['item', 'dc:subject', 'dc:identifier', 'dc:creator', 'dc:publisher'].includes(name);
  },
});

/**
 * NDL OpenSearch APIのXMLレスポンスをパースして書誌データを返す
 */
export function parseNdlResponse(xml: string): {
  totalResults: number;
  books: ParsedBook[];
} {
  const parsed = parser.parse(xml);

  const channel = parsed?.rss?.channel;
  if (!channel) {
    return { totalResults: 0, books: [] };
  }

  const totalResults = parseInt(channel['openSearch:totalResults'] ?? '0', 10);
  const items: RssItem[] = channel.item ?? [];

  const books: ParsedBook[] = [];

  for (const item of items) {
    // NDL書誌ID を取得
    const ndlBibId = extractIdentifier(item, 'dcndl:NDLBibID');
    if (!ndlBibId) continue; // 書誌IDがなければスキップ

    // タイトル
    const title = extractFirstString(item['dc:title']);
    if (!title) continue;

    // NDC分類（dcndl:NDC10 タイプのもの）
    const ndc = extractNdc(item);
    const ndcMajor = ndc ? ndc.charAt(0) : null;
    const ndcMid = ndc && ndc.length >= 2 ? ndc.substring(0, 2) : null;

    // 出版年月
    const issuedDate = item['dcterms:issued'] ?? null;
    const { year, month } = parseIssuedDate(issuedDate);

    books.push({
      ndlBibId,
      title,
      creator: extractFirstString(item['dc:creator']),
      publisher: extractFirstString(item['dc:publisher']),
      ndc: ndc,
      ndcMajor,
      ndcMid,
      issuedDate,
      issuedYear: year,
      issuedMonth: month,
      isbn: extractIdentifier(item, 'dcndl:ISBN'),
      price: item['dcndl:price']?.toString() ?? null,
      materialType: item['category']?.toString() ?? null,
    });
  }

  return { totalResults, books };
}

/**
 * dc:identifier から指定タイプの値を抽出
 */
function extractIdentifier(item: RssItem, type: string): string | null {
  const identifiers = item['dc:identifier'];
  if (!identifiers) return null;

  const arr = Array.isArray(identifiers) ? identifiers : [identifiers];
  for (const id of arr) {
    if (typeof id === 'object' && id['@_xsi:type'] === type) {
      return id['#text']?.toString() ?? null;
    }
    // 属性なしの場合（文字列として来る場合）
    if (typeof id === 'string' && type === 'dcndl:NDLBibID') {
      return null; // 属性なしではBibIDを特定できない
    }
  }
  return null;
}

/**
 * dc:subject から NDC10 分類を抽出
 */
function extractNdc(item: RssItem): string | null {
  const subjects = item['dc:subject'];
  if (!subjects) return null;

  const arr = Array.isArray(subjects) ? subjects : [subjects];
  for (const subj of arr) {
    if (typeof subj === 'object' && subj['@_xsi:type'] === 'dcndl:NDC10') {
      return subj['#text']?.toString() ?? null;
    }
    if (typeof subj === 'object' && subj['@_xsi:type'] === 'dcndl:NDC9') {
      return subj['#text']?.toString() ?? null;
    }
  }
  return null;
}

/**
 * 文字列または文字列配列から最初の値を取得
 */
function extractFirstString(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.toString() ?? null;
  return value.toString();
}

/**
 * 出版年月文字列 '2026.3' をパース
 */
function parseIssuedDate(issuedDate: string | null): {
  year: number | null;
  month: number | null;
} {
  if (!issuedDate) return { year: null, month: null };

  const str = issuedDate.toString();

  // 'YYYY.M' or 'YYYY.MM' or 'YYYY-M' or 'YYYY'
  const match = str.match(/^(\d{4})[.\-]?(\d{1,2})?/);
  if (!match) return { year: null, month: null };

  const year = parseInt(match[1], 10);
  const month = match[2] ? parseInt(match[2], 10) : null;

  return {
    year: isNaN(year) ? null : year,
    month: month !== null && !isNaN(month) && month >= 1 && month <= 12 ? month : null,
  };
}
