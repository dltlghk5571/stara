"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Place } from "@/types";
import { getArtistById } from "@/data/artists";
import { getQuestsForPlace } from "@/data/quests";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";

interface Props {
  place: Place;
  onClose: () => void;
}

/** Place엔 contentTypeId가 없어 카테고리로 추정한다 — detailCommon2(개요/주소)는 타입 무관하게
 * 동작하니 detailIntro2(운영시간 등)만 부정확할 수 있는 낮은 리스크. */
function guessContentTypeId(category: Place["category"]): string {
  if (category === "food") return "39";
  if (category === "culture") return "14";
  return "12";
}

interface TourismInfo {
  overview: string | null;
  address: string | null;
  tel: string | null;
}

function useTourismInfo(contentId: string | undefined, category: Place["category"]) {
  const [info, setInfo] = useState<TourismInfo | null>(null);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    // place가 바뀌면 ReelsPanel이 key={place.id}로 이 컴포넌트를 통째로 리마운트하므로
    // 여기서 이전 place의 상태를 직접 리셋할 필요가 없다(리마운트 시 초기값 null/[]).
    if (!contentId) return;
    let cancelled = false;
    const contentTypeId = guessContentTypeId(category);
    fetch(`/api/tourism/detail?contentId=${contentId}&contentTypeId=${contentTypeId}`)
      .then((res) => res.json())
      .then((json: { detail: TourismInfo | null }) => {
        if (!cancelled) setInfo(json.detail);
      })
      .catch(() => {});
    fetch(`/api/tourism/images?contentId=${contentId}`)
      .then((res) => res.json())
      .then((json: { images?: string[] }) => {
        if (!cancelled) setImages(json.images ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [contentId, category]);

  return { info, images };
}

/** 모바일: 하단 bottom sheet. 관계 설명을 최상단에 노출. */
export default function PlaceDetailSheet({ place, onClose }: Props) {
  const style = CATEGORY_STYLE[place.category];
  const artists = place.artistIds.map((id) => getArtistById(id)).filter(Boolean);
  const quests = getQuestsForPlace(place);
  const { info: tourismInfo, images: tourismImages } = useTourismInfo(place.contentId, place.category);

  return (
    <div className="place-sheet" onClick={onClose}>
      <div className="place-sheet-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
          <span className="cat-tag" style={{ background: style.color, borderRadius: "100px", padding: "5px 10px", fontSize: "12px", fontWeight: 700, color: "#fff" }}>
            {style.labelKo}
          </span>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ width: "40px", height: "40px", borderRadius: "50%", color: "var(--gray)", background: "none", border: "none" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: "16px", borderRadius: "14px", background: "rgba(255,143,122,.1)", padding: "12px", fontSize: "13px", color: "var(--navy)" }}>
          <p style={{ fontWeight: 700 }}>{artists.map((a) => a?.name).join(", ") || "STARA 추천"}와의 관계</p>
          <p style={{ marginTop: "4px", lineHeight: 1.5 }}>{place.relationTextKo}</p>
        </div>

        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 700, color: "var(--navy)" }}>{place.nameKo}</h2>
        <p style={{ fontSize: "13px", color: "var(--gray)" }}>{place.nameEn}</p>

        <dl style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px", color: "var(--navy)" }}>
          <div>
            <dt style={{ fontSize: "11px", color: "var(--gray)" }}>운영시간</dt>
            <dd>
              {place.openTime && place.closeTime
                ? `${place.openTime} ~ ${place.closeTime}`
                : "정보 없음"}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: "11px", color: "var(--gray)" }}>예상 체류시간</dt>
            <dd>{place.dwellMinutes}분</dd>
          </div>
        </dl>

        {quests.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--gray)" }}>연결된 퀘스트</p>
            <ul style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {quests.map((q) => (
                <li key={q.id} style={{ borderRadius: "10px", background: "rgba(142,231,200,.2)", padding: "8px 12px", fontSize: "13px" }}>
                  <p style={{ fontWeight: 600, color: "var(--navy)" }}>{q.titleKo}</p>
                  <p style={{ fontSize: "11px", color: "var(--gray)" }}>{q.descriptionKo}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(tourismInfo?.overview || tourismImages.length > 0) && (
          <div style={{ marginTop: "16px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--gray)" }}>관광 정보 (한국관광공사)</p>
            {tourismImages.length > 0 && (
              <div style={{ marginTop: "8px", display: "flex", gap: "8px", overflowX: "auto" }}>
                {tourismImages.slice(0, 5).map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element -- 외부 KTO 이미지, 도메인 미확정이라 next/image 최적화 대상 아님
                  <img
                    key={src}
                    src={src}
                    alt=""
                    style={{ width: "96px", height: "96px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}
                  />
                ))}
              </div>
            )}
            {tourismInfo?.overview && (
              <p style={{ marginTop: "8px", fontSize: "13px", lineHeight: 1.5, color: "var(--navy)" }}>
                {tourismInfo.overview}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
