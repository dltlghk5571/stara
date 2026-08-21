"use client";

import { Clock, Info, Plus, Check } from "lucide-react";
import type { Place } from "@/types";
import { getArtistById } from "@/data/artists";
import { getQuestsForPlace } from "@/data/quests";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";

interface Props {
  place: Place;
  isSelected: boolean;
  estimatedAddedMinutes: number;
  onToggle: () => void;
  onShowDetail: () => void;
}

export default function ReelCard({
  place,
  isSelected,
  estimatedAddedMinutes,
  onToggle,
  onShowDetail,
}: Props) {
  const style = CATEGORY_STYLE[place.category];
  const Icon = style.icon;
  const artistNames = place.artistIds
    .map((id) => getArtistById(id)?.name)
    .filter(Boolean)
    .join(", ");
  const quests = getQuestsForPlace(place);

  return (
    <div className="candidate-card">
      <div className="banner" style={{ background: `linear-gradient(135deg, ${style.color}, ${style.color}99)` }}>
        <Icon size={40} />
      </div>

      <div className="body">
        <div className="row">
          <span className="cat-tag" style={{ background: style.color }}>
            {style.labelKo}
          </span>
          {artistNames && <span className="artists">{artistNames}</span>}
        </div>

        <div>
          <h3>{place.nameKo}</h3>
          <p>{place.relationTextKo}</p>
        </div>

        <dl>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={14} />
            체류 {place.dwellMinutes}분
          </div>
          <div>
            운영 {place.openTime}~{place.closeTime}
          </div>
          <div className="added-min">루트에 추가 시 약 +{estimatedAddedMinutes}분 소요</div>
        </dl>

        {quests.length > 0 && (
          <div className="quests">
            <span style={{ fontWeight: 700 }}>연결된 퀘스트</span>
            <ul style={{ marginTop: "4px", paddingLeft: "16px", listStyle: "disc" }}>
              {quests.map((q) => (
                <li key={q.id}>{q.titleKo}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="footer">
        <button
          type="button"
          onClick={onToggle}
          className="btn"
          style={{
            flex: 1,
            height: "44px",
            fontSize: "13px",
            background: isSelected ? "#e7e2d4" : "var(--coral)",
            color: isSelected ? "var(--navy)" : "#fff",
          }}
        >
          {isSelected ? (
            <>
              <Check size={16} /> 루트에서 제거
            </>
          ) : (
            <>
              <Plus size={16} /> 루트에 추가
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onShowDetail}
          aria-label="상세정보"
          className="btn btn-outline"
          style={{ height: "44px", width: "44px", flex: "none" }}
        >
          <Info size={18} />
        </button>
      </div>
    </div>
  );
}
