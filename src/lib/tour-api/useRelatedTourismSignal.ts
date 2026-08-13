import { useEffect, useState } from "react";
import type { Place } from "@/types";
import { MAIN_ROUTE_SIGNGU_CD } from "./relatedTourism";

const EMPTY = new Map<string, number>();
const sessionCache = new Map<string, Promise<Map<string, number>>>();

async function fetchScores(
  anchors: { name: string; signguCd: string }[]
): Promise<Map<string, number>> {
  try {
    const res = await fetch("/api/tourism/related", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anchors }),
    });
    if (!res.ok) return EMPTY;
    const json = (await res.json()) as { scores?: Record<string, number> };
    return new Map(Object.entries(json.scores ?? {}));
  } catch {
    return EMPTY;
  }
}

interface Loaded {
  key: string;
  scores: Map<string, number>;
}

/** STARA 메인 루트(고정) 기준 연관 관광지 점수 맵을 한 번만 가져와 세션 동안 재사용한다. */
export function useRelatedTourismSignal(mainPlaces: Place[]): Map<string, number> {
  const anchors = mainPlaces
    .map((p) => {
      const signguCd = MAIN_ROUTE_SIGNGU_CD[p.id];
      return signguCd ? { name: p.nameKo, signguCd } : null;
    })
    .filter((a): a is { name: string; signguCd: string } => !!a);

  const key = anchors.length > 0 ? anchors.map((a) => a.name).join(">") : null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!key) return;

    let cancelled = false;
    let request = sessionCache.get(key);
    if (!request) {
      request = fetchScores(anchors);
      sessionCache.set(key, request);
    }

    request.then((scores) => {
      if (!cancelled) setLoaded({ key, scores });
    });

    return () => {
      cancelled = true;
    };
    // key(anchor 이름 signature)만으로 재요청 여부를 판단한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key || !loaded || loaded.key !== key) return EMPTY;
  return loaded.scores;
}
