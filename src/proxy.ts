import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 전역 보호 없음 — 컬렉션북 공개 페이지 등은 로그인 없이도 볼 수 있어야 한다.
// 로그인이 필요한 동작(사진 업로드 등)은 각 API 라우트에서도 auth()로 개별 체크한다.
// 온보딩부터 실제 여행 진행(퀘스트 인증샷 필수)까지는 로그인을 첫 관문으로 강제한다 —
// 미로그인 접근 시 프로젝트 자체 로그인 페이지(/sign-in)로 리다이렉트된다.
const isProtectedRoute = createRouteMatcher([
  "/onboarding(.*)",
  "/trip(.*)",
  "/edit(.*)",
  "/complete(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
