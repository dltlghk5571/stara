import { clerkMiddleware } from "@clerk/nextjs/server";

// 전역 보호 없음 — 대부분 페이지는 로그인 없이 사용 가능.
// 로그인이 필요한 동작(사진 업로드 등)은 각 API 라우트에서 auth()로 개별 체크한다.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
