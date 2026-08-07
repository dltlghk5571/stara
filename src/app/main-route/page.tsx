import Link from "next/link";
import { MAIN_ROUTE_PLACE_IDS, getPlaceById } from "@/data/places";
import { buildSchedule } from "@/lib/scheduleCalculator";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";
import { TRIP_START_TIME } from "@/config";
import TopBar from "@/components/layout/TopBar";
import MapView from "@/components/map/MapView";
import type { Place } from "@/types";

export default function MainRoutePage() {
  const mainPlaces = MAIN_ROUTE_PLACE_IDS.map((id) => getPlaceById(id)).filter(
    (p): p is Place => !!p
  );
  const schedule = buildSchedule(mainPlaces);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="서울 메인 루트" backHref="/" />

      <div className="h-64 w-full shrink-0 sm:h-80">
        <MapView
          pins={mainPlaces.map((p, i) => ({
            id: p.id,
            lat: p.latitude,
            lng: p.longitude,
            order: i + 1,
            color: CATEGORY_STYLE[p.category].color,
            title: p.nameKo,
          }))}
          showPath
        />
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-400">시작</p>
            <p className="font-bold">{TRIP_START_TIME}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">종료 예상</p>
            <p className="font-bold">{schedule.endTime}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">총 이동시간</p>
            <p className="font-bold">{schedule.totalTravelMinutes}분</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">총 체류시간</p>
            <p className="font-bold">{schedule.totalDwellMinutes}분</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            기본 체크포인트
          </p>
          <ol className="flex flex-col gap-2">
            {schedule.stops.map((stop) => (
              <li
                key={stop.place.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: CATEGORY_STYLE[stop.place.category].color }}
                >
                  {stop.order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {stop.place.nameKo}
                  </p>
                  <p className="text-xs text-slate-400">
                    도착 {stop.arrival} · 체류 {stop.place.dwellMinutes}분
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <Link
          href="/edit"
          className="sticky bottom-4 mt-2 flex min-h-11 items-center justify-center rounded-xl bg-fuchsia-600 text-sm font-bold text-white hover:bg-fuchsia-700"
        >
          나만의 루트 만들기
        </Link>
      </main>
    </div>
  );
}
