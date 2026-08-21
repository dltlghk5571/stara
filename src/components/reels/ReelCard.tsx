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
    <div className="font-jakarta flex h-full w-full snap-start flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_18px_-12px_rgba(36,59,83,0.3)]">
      <div
        className="flex h-36 shrink-0 items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${style.color}, ${style.color}99)`,
        }}
      >
        <Icon size={40} className="text-white/90" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: style.color }}
            >
              {style.labelKo}
            </span>
            {artistNames && (
              <span className="truncate text-sm font-semibold text-stara-coral">
                {artistNames}
              </span>
            )}
          </div>

          <div>
            <h3 className="font-fraunces text-lg font-bold text-stara-navy">
              {place.nameKo}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-stone-500">
              {place.relationTextKo}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-xs text-stone-500">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              체류 {place.dwellMinutes}분
            </div>
            <div>
              운영 {place.openTime}~{place.closeTime}
            </div>
            <div className="col-span-2 font-space-mono font-semibold text-emerald-600">
              루트에 추가 시 약 +{estimatedAddedMinutes}분 소요
            </div>
          </dl>

          {quests.length > 0 && (
            <div className="rounded-xl bg-stara-mint/20 p-2.5 text-xs text-stara-navy">
              <span className="font-bold">연결된 퀘스트</span>
              <ul className="mt-1 list-disc pl-4">
                {quests.map((q) => (
                  <li key={q.id}>{q.titleKo}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-stone-100 p-4">
        <button
          type="button"
          onClick={onToggle}
          className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold transition-colors ${
            isSelected
              ? "bg-stone-200 text-stara-navy"
              : "bg-stara-coral text-white shadow-lg shadow-orange-200"
          }`}
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
          className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl border-2 border-stone-200 text-stone-500"
        >
          <Info size={18} />
        </button>
      </div>
    </div>
  );
}
