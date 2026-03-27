/**
 * バックフィルスクリプト
 * ローカルから直接実行して過去データを一括取得
 *
 * 使い方:
 *   node scripts/backfill.mjs 2024-01 2026-01
 */

import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

const SUPABASE_URL = 'https://kpnauudrjvjkwupladih.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY を環境変数に設定してください');
  console.error('export SUPABASE_SERVICE_ROLE_KEY="..."');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const NDL_API_BASE = 'https://ndlsearch.ndl.go.jp/api/opensearch';

const NDC_QUERIES = [
  '0', '1', '2', '3', '4', '5', '6', '8', '9',
  '70', '71', '73', '74', '75', '76', '77', '78', '79',
  '726', '720', '721', '722', '723', '724', '725', '727', '728', '729',
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  isArray: (name) => ['item', 'dc:subject', 'dc:identifier', 'dc:creator', 'dc:publisher'].includes(name),
});

function generateMonthRange(from, until) {
  const months = [];
  const [fy, fm] = from.split('-').map(Number);
  const [uy, um] = until.split('-').map(Number);
  let y = fy, m = fm;
  while (y < uy || (y === uy && m <= um)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function parseBooks(xml) {
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel;
  if (!channel) return { total: 0, books: [] };

  const total = parseInt(channel['openSearch:totalResults'] ?? '0', 10);
  const items = channel.item ?? [];
  const books = [];

  for (const item of items) {
    const ids = item['dc:identifier'] ?? [];
    let bibId = null, isbn = null;
    for (const id of (Array.isArray(ids) ? ids : [ids])) {
      if (typeof id === 'object') {
        if (id['@_xsi:type'] === 'dcndl:NDLBibID') bibId = id['#text'];
        if (id['@_xsi:type'] === 'dcndl:ISBN') isbn = id['#text'];
      }
    }
    if (!bibId) continue;

    const title = Array.isArray(item['dc:title']) ? item['dc:title'][0] : item['dc:title'];
    if (!title) continue;

    const subjects = item['dc:subject'] ?? [];
    let ndc = null;
    for (const s of (Array.isArray(subjects) ? subjects : [subjects])) {
      if (typeof s === 'object' && (s['@_xsi:type'] === 'dcndl:NDC10' || s['@_xsi:type'] === 'dcndl:NDC9')) {
        ndc = s['#text'];
      }
    }

    const issued = item['dcterms:issued'] ?? null;
    let issuedYear = null, issuedMonth = null;
    if (issued) {
      const match = issued.toString().match(/^(\d{4})[.\-]?(\d{1,2})?/);
      if (match) {
        issuedYear = parseInt(match[1], 10);
        issuedMonth = match[2] ? parseInt(match[2], 10) : null;
        if (issuedMonth && (issuedMonth < 1 || issuedMonth > 12)) issuedMonth = null;
      }
    }

    const creator = item['dc:creator'];
    const publisher = item['dc:publisher'];

    books.push({
      ndl_bib_id: bibId.toString(),
      title: title.toString(),
      creator: Array.isArray(creator) ? creator[0]?.toString() : creator?.toString() ?? null,
      publisher: Array.isArray(publisher) ? publisher[0]?.toString() : publisher?.toString() ?? null,
      ndc,
      ndc_major: ndc ? ndc.charAt(0) : null,
      ndc_mid: ndc && ndc.length >= 2 ? ndc.substring(0, 2) : null,
      issued_date: issued?.toString() ?? null,
      issued_year: issuedYear,
      issued_month: issuedMonth,
      isbn: isbn?.toString() ?? null,
      price: item['dcndl:price']?.toString() ?? null,
      material_type: item['category']?.toString() ?? null,
    });
  }

  return { total, books };
}

async function fetchAndStore(ndcQuery, month) {
  const url = `${NDL_API_BASE}?dpid=iss-ndl-opac&ndc=${ndcQuery}&from=${month}&until=${month}&cnt=500&idx=1`;
  const res = await fetch(url, { headers: { Accept: 'application/xml' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const xml = await res.text();
  const { total, books } = parseBooks(xml);

  let newCount = 0;
  if (books.length > 0) {
    for (let i = 0; i < books.length; i += 100) {
      const batch = books.slice(i, i + 100);
      const { data, error } = await supabase
        .from('books')
        .upsert(batch, { onConflict: 'ndl_bib_id', ignoreDuplicates: false })
        .select('id');
      if (error) throw new Error(error.message);
      newCount += data?.length ?? 0;
    }
  }

  return { total, fetched: books.length, new: newCount };
}

async function main() {
  const fromMonth = process.argv[2] ?? '2024-01';
  const untilMonth = process.argv[3] ?? '2026-01';

  const months = generateMonthRange(fromMonth, untilMonth);
  console.log(`Backfill: ${fromMonth} → ${untilMonth} (${months.length} months × ${NDC_QUERIES.length} queries)`);

  let totalNew = 0;
  let queryCount = 0;

  for (const month of months) {
    let monthNew = 0;
    for (const ndc of NDC_QUERIES) {
      try {
        const result = await fetchAndStore(ndc, month);
        monthNew += result.new;
        queryCount++;
        process.stdout.write(`\r  ${month} NDC=${ndc}: ${result.fetched} fetched, ${result.new} new (query ${queryCount}/${months.length * NDC_QUERIES.length})`);
      } catch (err) {
        console.error(`\n  ❌ ${month} NDC=${ndc}: ${err.message}`);
      }
      // 1秒待機
      await new Promise(r => setTimeout(r, 1000));
    }
    totalNew += monthNew;
    console.log(`\n  ✅ ${month}: +${monthNew} books`);
  }

  console.log(`\n🎉 Backfill complete: ${totalNew} new books added`);
}

main().catch(console.error);
