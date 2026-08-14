import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "STARA - 스타 따라 STARA",
  description: "K-pop 아티스트의 발자취를 따라가는 게임형 서울 여행 코스, STARA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        {/*
          일반 <script> 태그(next/script 아님) — TMap SDK가 내부적으로 document.write()로
          자기 하위 모듈을 불러오는 구식 방식이라, 브라우저 HTML 파서가 직접 만난 <script>여야
          document.write가 동작한다. next/script는 strategy와 무관하게 클라이언트 JS로
          createElement('script') 하기 때문에 이 SDK엔 안 맞는다.
        */}
        <script
          src={`https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${process.env.NEXT_PUBLIC_TMAP_APP_KEY}`}
        />
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
