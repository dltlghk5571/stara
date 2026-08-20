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
    <div className="flex h-full w-full snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
              className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: style.color }}
            >
              {style.labelKo}
            </span>
            {artistNames && (
              <span className="truncate text-sm font-medium text-fuchsia-600 dark:text-fuchsia-400">
                {artistNames}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {place.nameKo}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {place.relationTextKo}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              체류 {place.dwellMinutes}분
            </div>
            <div>
              운영 {place.openTime}~{place.closeTime}
            </div>
            <div className="col-span-2 font-medium text-emerald-600 dark:text-emerald-400">
              루트에 추가 시 약 +{estimatedAddedMinutes}분 소요
            </div>
          </dl>

          {quests.length > 0 && (
            <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <span className="font-semibold">연결된 퀘스트</span>
              <ul className="mt-1 list-disc pl-4">
                {quests.map((q) => (
                  <li key={q.id}>{q.titleKo}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
        <button
          type="button"
          onClick={onToggle}
          className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors ${
            isSelected
              ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              : "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
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
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Info size={18} />
        </button>
      </div>
    </div>
  );
}
