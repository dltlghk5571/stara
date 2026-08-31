import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import "@/styles/prototype.css";
// kroute.html(새 와이어프레임) 리스킨용 전역 스타일 — 이관이 끝나면 위 prototype.css를 뺀다.
import "@/styles/kroute.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-neutral-900`}
    >
      <head>
        {/* stara_full_prototype_en.html 이 쓰는 것과 동일한 구글 폰트 — 프로토타입 CSS가
            'Fraunces'/'Plus Jakarta Sans'/'Caveat'/'Space Mono'를 문자열로 그대로 참조하므로
            next/font/google(스코프드 이름 생성)이 아니라 원본과 같은 방식으로 로드해야 매칭된다. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Caveat:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Outfit:wght@400;600;700;800;900&family=Nunito:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* 지도 앱 특성상 스마트폰 화면 사용을 기준으로 설계 — 넓은 화면(데스크톱)에서는
          실제 폰처럼 가운데 정렬된 좁은 프레임으로 보이게 하고, 폰 화면(<=430px)에서는
          그대로 꽉 채운다. kroute.html 프로토타입의 Shell 컴포넌트와 동일한 값. */}
      <body
        className="mx-auto flex min-h-full max-w-[430px] flex-col overflow-x-hidden bg-slate-50 text-slate-900 shadow-[0_0_60px_rgba(0,0,0,0.6)] dark:bg-slate-950 dark:text-slate-50"
        style={{ transform: "translateZ(0)" }} /* position:fixed 오버레이가 뷰포트 전체가 아니라 이 프레임 안에만 뜨도록 containing block 지정 */
      >
        <ClerkProvider>{children}</ClerkProvider>
        {/*
          일반 <script> 태그(next/script 아님) — TMap SDK가 내부적으로 document.write()로
          자기 하위 모듈을 불러오는 구식 방식이라, 브라우저 HTML 파서가 직접 만난 <script>여야
          document.write가 동작한다. next/script는 strategy와 무관하게 클라이언트 JS로
          createElement('script') 하기 때문에 이 SDK엔 안 맞는다.
          children 뒤에 둬서 지도가 필요 없는 페이지(로그인 등)는 이 스크립트를 기다리지 않고 먼저 그려지게 한다.
          ponytail: 그래도 페이지 전체가 결국 이 요청 하나를 물고 있음 — /trip, /edit 전용
          레이아웃으로 옮기면 그 페이지들 밖에선 아예 안 불러오게 할 수 있음, 필요해지면 그때.
        */}
        <script
          src={`https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${process.env.NEXT_PUBLIC_TMAP_APP_KEY}`}
        />
      </body>
    </html>
  );
}
