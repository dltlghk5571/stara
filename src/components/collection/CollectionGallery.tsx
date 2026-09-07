"use client";

import { getPlaceById } from "@/data/places";
import { useLocale, useT, placeName } from "@/i18n";
import type { questPhotos } from "@/db/schema";

interface Props {
  photos: (typeof questPhotos.$inferSelect)[];
}

/** 체크포인트별 인증샷 기록 목록 */
export default function CollectionGallery({ photos }: Props) {
  const { locale } = useLocale();
  const t = useT();

  if (photos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-900">
        {t("collection.galleryEmpty")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {photos.map((photo) => {
        const place = getPlaceById(photo.placeId);
        return (
          <li
            key={photo.id}
            className="flex gap-3 rounded-2xl border border-slate-200 p-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.photoUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-xl object-cover"
            />
            <div className="flex min-w-0 flex-col justify-center">
              <p className="truncate text-sm font-semibold text-slate-900">
                {place ? placeName(place, locale) : photo.placeId}
              </p>
              <p className="text-xs text-slate-900">
                {new Date(photo.completedAt).toLocaleDateString(
                  locale === "ko" ? "ko-KR" : "en-US",
                )}
              </p>
              {photo.note && (
                <p className="mt-1 truncate text-xs text-slate-900">
                  {photo.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
