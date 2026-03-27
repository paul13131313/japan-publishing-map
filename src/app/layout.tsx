import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerif = Noto_Serif_JP({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "日本の出版マップ — JAPAN PUBLISHING MAP",
  description:
    "国立国会図書館の書誌データから、日本の出版トレンドをリアルタイムに可視化するダッシュボード。NDC分類×出版年月のインタラクティブな探索。",
  openGraph: {
    title: "日本の出版マップ — JAPAN PUBLISHING MAP",
    description:
      "国立国会図書館APIで日本の出版トレンドをリアルタイム可視化",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSans.variable} ${notoSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-gray-100 font-[family-name:var(--font-noto-sans)]">
        {children}
      </body>
    </html>
  );
}
