"use client";

import { useRef, useState } from "react";
import type { Place } from "@/types";
import ReelCard from "./ReelCard";
import PlaceDetailSheet from "./PlaceDetailSheet";
import { estimateAddedMinutes } from "@/lib/routeOptimizer";

interface Props {
  places: Place[];
  baseOrder: Place[];
  selectedPlaceIds: string[];
  onToggle: (placeId: string) => void;
}

// 릴스 패널은 지도와 별도 영역(하단 시트/사이드 패널)에 있으므로
// 지도의 터치 제스처와 겹치지 않는다. touch-action으로 세로 스크롤만 허용해 안정성을 높인다.
export default function ReelsPanel({ places, baseOrder, selectedPlaceIds, onToggle }: Props) {
  const [index, setIndex] = useState(0);
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function scrollToIndex(next: number) {
    const el = containerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(places.length - 1, next));
    el.scrollTo({ top: clamped * el.clientHeight, behavior: "smooth" });
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el || el.clientHeight === 0) return;
    setIndex(Math.round(el.scrollTop / el.clientHeight));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      scrollToIndex(index + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      scrollToIndex(index - 1);
    }
  }

  if (places.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center", fontSize: "13px", color: "var(--gray)" }}>
        조건에 맞는 장소가 없습니다. 필터를 조정해보세요.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column", width: "100%" }}>
      <div className="candidate-progress">
        <b>
          {index + 1} / {places.length}
        </b>
        <div className="track">
          <div className="fill" style={{ width: `${((index + 1) / places.length) * 100}%` }} />
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="listbox"
        aria-label="추천 장소 카드"
        style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "0 16px 16px", outline: "none", touchAction: "pan-y" }}
      >
        {places.map((place) => (
          <div key={place.id} style={{ height: "100%", width: "100%", padding: "8px 0" }}>
            <ReelCard
              place={place}
              isSelected={selectedPlaceIds.includes(place.id)}
              estimatedAddedMinutes={estimateAddedMinutes(baseOrder, place)}
              onToggle={() => onToggle(place.id)}
              onShowDetail={() => setDetailPlace(place)}
            />
          </div>
        ))}
      </div>

      {detailPlace && (
        <PlaceDetailSheet place={detailPlace} onClose={() => setDetailPlace(null)} />
      )}
    </div>
  );
}
