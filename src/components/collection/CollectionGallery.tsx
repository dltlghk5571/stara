import { getPlaceById } from "@/data/places";
import type { questPhotos } from "@/db/schema";

interface Props {
  photos: (typeof questPhotos.$inferSelect)[];
}

/** 체크포인트별 인증샷 기록 목록 */
export default function CollectionGallery({ photos }: Props) {
  if (photos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
        아직 등록된 인증샷이 없어요
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
            className="flex gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.photoUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-xl object-cover"
            />
            <div className="flex min-w-0 flex-col justify-center">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {place?.nameKo ?? photo.placeId}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(photo.completedAt).toLocaleDateString("ko-KR")}
              </p>
              {photo.note && (
                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
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
