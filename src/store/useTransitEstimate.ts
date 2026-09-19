import { useEffect, useState } from "react";
import type { Place } from "@/types";
import type { Locale } from "@/i18n";
import type { TransitGuideResponse } from "@/lib/transit/types";

/** detail:false 응답은 절대 "itinerary"가 아니다(서버가 그 모드에서 ODsay를 호출하지
 *  않으므로) — 그 보장을 타입에 그대로 남겨서 호출부에서 불필요한 분기를 없앤다. */
export type TransitBaseGuideResponse = Extract<TransitGuideResponse, { kind: "walk" | "estimate" }>;

export type TransitEstimateState =
  | { status: "loading" }
  | { status: "ready"; data: TransitBaseGuideResponse }
  | { status: "error" };

/**
 * /api/transit를 호출한다. detail:false(기본, 컴포넌트 마운트 시 자동 실행)는 ODsay를
 * 전혀 건드리지 않는다 — walk 또는 TMAP/Haversine estimate만 온다. detail:true는 사용자가
 * "상세 대중교통 경로 보기"를 명시적으로 눌렀을 때만 MovementGuide가 직접 호출한다.
 *
 * 응답을 캐시하지 않는다(의도적) — ODsay 응답 재사용 금지 정책 때문에, 세션/모듈 스코프
 * Map 같은 걸 두지 않는다. 호출부가 원하는 동안만(컴포넌트가 마운트돼 있는 동안, 혹은
 * 로컬 state 안) 결과를 들고 있다 — 재사용 가능한 저장소가 아니라 화면에 보여주는 동안의
 * presentation state일 뿐이다.
 */
export async function fetchTransitGuide(
  from: Place,
  to: Place,
  locale: Locale,
  detail: boolean
): Promise<TransitGuideResponse | null> {
  try {
    const res = await fetch("/api/transit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromPlaceId: from.id,
        toPlaceId: to.id,
        fromLat: from.latitude,
        fromLng: from.longitude,
        toLat: to.latitude,
        toLng: to.longitude,
        locale,
        detail,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as TransitGuideResponse;
  } catch {
    return null;
  }
}

/**
 * Place A→B 구간의 기본 이동 추정치(도보 또는 TMAP/Haversine 추정 소요시간)를 컴포넌트가
 * 마운트될 때 한 번 자동으로 가져온다. 항상 detail:false로 요청하므로 ODsay는 절대 호출
 * 하지 않는다 — 상세 대중교통 경로는 MovementGuide가 사용자의 명시적 클릭에 한해 별도로
 * 요청한다. 재사용 캐시를 두지 않는다(이 훅 인스턴스가 마운트돼 있는 동안의 React state).
 */
interface Loaded {
  key: string;
  data: TransitBaseGuideResponse | null;
}

export function useTransitEstimate(from: Place, to: Place, locale: Locale): TransitEstimateState {
  const key = `${from.id}>${to.id}:${locale}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTransitGuide(from, to, locale, false).then((data) => {
      if (cancelled) return;
      // detail:false로 요청했으므로 data.kind는 "itinerary"일 수 없다(위 타입 주석 참고).
      setLoaded({ key, data: data as TransitBaseGuideResponse | null });
    });
    return () => {
      cancelled = true;
    };
    // key(구간+로케일 signature)만으로 재요청 여부를 판단한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!loaded || loaded.key !== key) return { status: "loading" };
  if (!loaded.data) return { status: "error" };
  return { status: "ready", data: loaded.data };
}
