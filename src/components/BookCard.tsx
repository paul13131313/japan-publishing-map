'use client';

import { NDC_CATEGORIES } from '@/lib/constants';

interface Book {
  title: string;
  creator: string | null;
  publisher: string | null;
  ndcMajor: string | null;
  isbn: string | null;
  issuedDate: string | null;
}

interface BookCardProps {
  book: Book;
}

function getThumbnailUrl(isbn: string | null): string | null {
  if (!isbn) return null;
  const cleaned = isbn.replace(/-/g, '');
  return `https://ndlsearch.ndl.go.jp/thumbnail/${cleaned}.jpg`;
}

export default function BookCard({ book }: BookCardProps) {
  const thumbnailUrl = getThumbnailUrl(book.isbn);
  const cat = book.ndcMajor
    ? NDC_CATEGORIES[book.ndcMajor as keyof typeof NDC_CATEGORIES]
    : null;

  return (
    <div className="flex-shrink-0 w-[200px] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden hover:border-gray-600 transition-colors">
      {/* 書影 */}
      <div className="h-[160px] bg-[#1a1a24] flex items-center justify-center overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={book.title}
            className="h-full w-auto object-contain"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const placeholder = document.createElement('div');
                placeholder.className = 'text-4xl';
                placeholder.textContent = cat?.icon ?? '📖';
                parent.appendChild(placeholder);
              }
            }}
          />
        ) : (
          <span className="text-4xl">{cat?.icon ?? '📖'}</span>
        )}
      </div>

      {/* 情報 */}
      <div className="p-3">
        {cat && (
          <span
            className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
            style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
          >
            {cat.icon} {cat.name}
          </span>
        )}
        <h3 className="text-xs font-bold leading-tight line-clamp-2 mb-1">
          {book.title}
        </h3>
        {book.creator && (
          <p className="text-[10px] text-gray-500 line-clamp-1">{book.creator}</p>
        )}
        {book.publisher && (
          <p className="text-[10px] text-gray-600 mt-0.5">{book.publisher}</p>
        )}
      </div>
    </div>
  );
}

interface BookListProps {
  books: Book[];
}

export function BookList({ books }: BookListProps) {
  if (books.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <h2 className="text-lg font-bold font-[family-name:var(--font-noto-serif)] mb-4">
          新着書籍
        </h2>
        <p className="text-gray-500 text-sm">データがありません</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 sm:p-6">
      <h2 className="text-lg font-bold font-[family-name:var(--font-noto-serif)] mb-4">
        新着書籍
      </h2>
      <div className="scroll-container flex gap-4 pb-2">
        {books.map((book, i) => (
          <BookCard key={i} book={book} />
        ))}
      </div>
    </div>
  );
}
