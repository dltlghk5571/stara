import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@clerk/nextjs/server";

/** 퀘스트 인증샷 클라이언트 직접 업로드용 토큰 발급. */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const { userId } = await auth();
        if (!userId) throw new Error("로그인이 필요해요");
        return {
          // 아이폰 카메라 기본 포맷(HEIC)도 받아야 함 — jpeg/png/webp로 제한하면
          // "고효율성(HEIC)" 설정을 쓰는 대다수 아이폰 사용자의 업로드가 그냥 막힘.
          // ponytail: HEIC는 저장은 되지만 Chrome 등에서 <img>로 못 띄움(Safari만 지원) —
          // 컬렉션북/카드 이미지에서 깨져 보일 수 있음. HEIC→JPEG 변환은 지금 스코프 밖,
          // 실사용에서 문제되면 sharp로 서버단 변환 추가.
          allowedContentTypes: ["image/*"],
          addRandomSuffix: true,
          maximumSizeInBytes: 8 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "upload failed" },
      { status: 400 }
    );
  }
}
