import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { and, desc, eq, isNull } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { questPhotos } from "@/db/schema";
import { getPlaceById } from "@/data/places";
import { getDictionary, translate, placeName as resolveStaticPlaceName, type Locale } from "@/i18n";

export const runtime = "nodejs";

/** trip.tsx/page.tsx의 "key = photo.tripId ?? 'legacy'" 규칙을 그대로 쓴다 — trip_id 컬럼
 *  도입 이전 행(레거시 기록)은 이 sentinel로만 가리킬 수 있다(실제 trip_id 값이 아님). */
const LEGACY_KEY = "legacy";

// STARA 브랜드 토큰(kroute-tokens.ts)을 카드에도 그대로 쓴다 — 다른 트럼/보라 그라디언트가
// 아니라 실제 앱과 같은 핑크/크림 배경 + 두꺼운 검정 테두리 + 하드 섀도우 스타일.
const PINK = "#FF3399";
const BLACK = "#111111";
const CREAM = "#FAF6EF";
const YELLOW = "#FFE566";
const BORDER = `4px solid ${BLACK}`;
const SHADOW = `8px 8px 0 ${BLACK}`;

// next/og(Satori)는 시스템 폰트를 못 읽어서 앱이 실제로 쓰는 폰트 파일을 직접 로드해야 한다
// (Outfit/Fraunces/Space Mono엔 한글 글리프가 없어 Noto Sans KR을 별도로 같이 넘긴다 —
// Satori가 폰트 목록에서 글자별로 지원하는 쪽을 자동 선택한다).
function loadFont(file: string): Buffer {
  return readFileSync(join(process.cwd(), "public/fonts", file));
}
const outfitBlack = loadFont("Outfit-Black.ttf");
const fraunces = loadFont("Fraunces-Bold.ttf");
const spaceMono = loadFont("SpaceMono-Bold.ttf");
const notoKr = loadFont("NotoSansKR-Bold.ttf");

/** 컬렉션북(공개, username 기준)과 달리 다이어리는 트립 하나 스코프의 비공개 기록이라 항상
 *  Clerk 세션에서 직접 userId를 얻는다 — URL에는 절대 userId를 넣지 않는다. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripKey: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("unauthorized", { status: 401 });

  const { tripKey } = await params;
  const locale: Locale = new URL(request.url).searchParams.get("locale") === "ko" ? "ko" : "en";
  const d = getDictionary(locale);

  const db = getDb();
  const tripCondition =
    tripKey === LEGACY_KEY ? isNull(questPhotos.tripId) : eq(questPhotos.tripId, tripKey);
  const allPhotos = await db
    .select()
    .from(questPhotos)
    .where(and(eq(questPhotos.userId, userId), tripCondition))
    .orderBy(desc(questPhotos.completedAt))
    .limit(6);

  if (allPhotos.length === 0) return new Response("not found", { status: 404 });

  // next/og(Satori)가 못 읽는 HEIC 하나 때문에 카드 전체가 500나는 걸 막는 방어선
  // (업로드 단계에서 이제 JPEG로 변환되지만 그 전 데이터가 남아있을 수 있음).
  const photos = allPhotos.filter((p) => !/\.hei[cf](\?|$)/i.test(p.photoUrl));
  const tripName = allPhotos[0].tripName ?? translate(d, "trip.prevRecord");

  function resolvePhotoPlaceName(p: (typeof photos)[number]): string {
    // 우선순위는 클라이언트 resolvePlaceName과 동일(TripShellClient.tsx) — 완료 시점 스냅샷을
    // 최우선으로 쓰고, 없으면 현재 static 장소 데이터로 폴백한다(dynamic 후보는 클라이언트
    // 전용 상태라 서버 라우트에서는 애초에 재구성할 수 없음).
    if (p.placeName) return p.placeName;
    const place = getPlaceById(p.placeId);
    if (place) return resolveStaticPlaceName(place, locale);
    return translate(d, "trip.noPlaceInfo");
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1920px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: PINK,
          padding: "64px",
          fontFamily: "Outfit, NotoSansKR",
          overflow: "hidden",
        }}
      >
        {/* 스플래시 화면(src/app/page.tsx)의 장식 원과 같은 모티프 — 카드가 STARA 앱과 같은
            비주얼로 읽히게 한다. */}
        <div
          style={{
            position: "absolute", top: -90, right: -90, width: 300, height: 300,
            borderRadius: "50%", border: "6px solid rgba(0,0,0,.14)", display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: -70, left: -70, width: 240, height: 240,
            borderRadius: "50%", border: "6px solid rgba(0,0,0,.14)", display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", marginBottom: "40px" }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: YELLOW,
              border: BORDER,
              borderRadius: "100px",
              padding: "8px 24px",
              fontSize: 26,
              fontWeight: 900,
              color: BLACK,
              letterSpacing: 2,
              marginBottom: "20px",
            }}
          >
            STARA · K-ROUTE DIARY
          </div>
          <div style={{ display: "flex", fontFamily: "Fraunces, NotoSansKR", fontSize: 64, fontWeight: 700, color: BLACK }}>
            {tripName}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
          {photos.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                flexDirection: "column",
                // 폭 464px × 2 + gap 24px = 952px = 카드 콘텐츠 폭(1080 - 좌우 패딩 64×2).
                width: "464px",
                borderRadius: "20px",
                overflow: "hidden",
                background: CREAM,
                border: BORDER,
                boxShadow: SHADOW,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.photoUrl}
                alt=""
                width={456}
                height={360}
                style={{ objectFit: "cover", borderBottom: BORDER }}
              />
              <div
                style={{
                  display: "flex",
                  padding: "14px 18px",
                  fontFamily: "Fraunces, NotoSansKR",
                  fontSize: 26,
                  fontWeight: 700,
                  color: BLACK,
                }}
              >
                {resolvePhotoPlaceName(p)}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "auto",
            alignSelf: "flex-start",
            background: BLACK,
            borderRadius: "100px",
            padding: "10px 22px",
            fontFamily: "Space Mono, NotoSansKR",
            fontSize: 24,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {translate(d, "trip.diaryShareHashtags", { count: photos.length })}
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: [
        { name: "Outfit", data: outfitBlack, weight: 900, style: "normal" },
        { name: "Fraunces", data: fraunces, weight: 700, style: "normal" },
        { name: "Space Mono", data: spaceMono, weight: 700, style: "normal" },
        { name: "NotoSansKR", data: notoKr, weight: 700, style: "normal" },
      ],
    }
  );
}
