"use client";

import { X } from "lucide-react";
import type { Place } from "@/types";
import { getArtistById } from "@/data/artists";
import { getQuestsForPlace } from "@/data/quests";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";

interface Props {
  place: Place;
  onClose: () => void;
}

/** 모바일: 하단 bottom sheet. 관계 설명을 최상단에 노출. */
export default function PlaceDetailSheet({ place, onClose }: Props) {
  const style = CATEGORY_STYLE[place.category];
  const artists = place.artistIds.map((id) => getArtistById(id)).filter(Boolean);
  const quests = getQuestsForPlace(place);

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
              {place.openTime} ~ {place.closeTime}
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
      </div>
    </div>
  );
}
