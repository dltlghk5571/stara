"use client";

import { Clock, Info, Plus, Check } from "lucide-react";
import type { Place } from "@/types";
import { getArtistById } from "@/data/artists";
import { getQuestsForPlace } from "@/data/quests";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";
import {
  useT,
  useLocale,
  placeName,
  placeRelation,
  questTitle,
  categoryLabel,
  artistName,
} from "@/i18n";

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
  const t = useT();
  const { locale } = useLocale();
  const style = CATEGORY_STYLE[place.category];
  const Icon = style.icon;
  const artistNames = place.artistIds
    .map((id) => {
      const a = getArtistById(id);
      return a ? artistName(a, locale) : null;
    })
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
            {categoryLabel(place.category, locale)}
          </span>
          {artistNames && <span className="artists">{artistNames}</span>}
        </div>

        <div>
          <h3>{placeName(place, locale)}</h3>
          <p>{placeRelation(place, locale)}</p>
        </div>

        <dl>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={14} />
            {t("reels.dwell", { n: place.dwellMinutes })}
          </div>
          <div>
            {place.openTime && place.closeTime
              ? t("reels.hours", { range: `${place.openTime}~${place.closeTime}` })
              : t("common.noInfo")}
          </div>
          <div className="added-min">{t("reels.addedMinutes", { n: estimatedAddedMinutes })}</div>
        </dl>

        {quests.length > 0 && (
          <div className="quests">
            <span style={{ fontWeight: 700 }}>{t("reels.linkedQuests")}</span>
            <ul style={{ marginTop: "4px", paddingLeft: "16px", listStyle: "disc" }}>
              {quests.map((q) => (
                <li key={q.id}>{questTitle(q, locale)}</li>
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
              <Check size={16} /> {t("reels.removeFromRoute")}
            </>
          ) : (
            <>
              <Plus size={16} /> {t("reels.addToRoute")}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onShowDetail}
          aria-label={t("reels.detailAria")}
          className="btn btn-outline"
          style={{ height: "44px", width: "44px", flex: "none" }}
        >
          <Info size={18} />
        </button>
      </div>
    </div>
  );
}
