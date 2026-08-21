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

/** 모바일: 하단 bottom sheet / 데스크톱: 중앙 dialog. 관계 설명을 최상단에 노출. */
export default function PlaceDetailSheet({ place, onClose }: Props) {
  const style = CATEGORY_STYLE[place.category];
  const artists = place.artistIds.map((id) => getArtistById(id)).filter(Boolean);
  const quests = getQuestsForPlace(place);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="font-jakarta max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
            style={{ backgroundColor: style.color }}
          >
            {style.labelKo}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-11 w-11 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 rounded-2xl bg-stara-coral/10 p-3 text-sm text-stara-navy">
          <p className="font-bold">
            {artists.map((a) => a?.name).join(", ") || "STARA 추천"}와의 관계
          </p>
          <p className="mt-1 leading-relaxed">{place.relationTextKo}</p>
        </div>

        <h2 className="font-fraunces text-xl font-bold text-stara-navy">
          {place.nameKo}
        </h2>
        <p className="text-sm text-stone-400">{place.nameEn}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-stone-600">
          <div>
            <dt className="text-xs text-stone-400">운영시간</dt>
            <dd>
              {place.openTime} ~ {place.closeTime}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-stone-400">예상 체류시간</dt>
            <dd>{place.dwellMinutes}분</dd>
          </div>
        </dl>

        {quests.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold text-stone-400">연결된 퀘스트</p>
            <ul className="mt-2 space-y-1.5">
              {quests.map((q) => (
                <li
                  key={q.id}
                  className="rounded-xl bg-stara-mint/20 px-3 py-2 text-sm"
                >
                  <p className="font-semibold text-stara-navy">{q.titleKo}</p>
                  <p className="text-xs text-stone-500">{q.descriptionKo}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
