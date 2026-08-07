import Link from "next/link";
import { Clock, MapPinned, Sparkles } from "lucide-react";
import { MAIN_ROUTE_PLACE_IDS, getPlaceById } from "@/data/places";
import { buildSchedule } from "@/lib/scheduleCalculator";
import { SEOUL_MAIN_ROUTE } from "@/data/routes";
import type { Place } from "@/types";

export default function HomePage() {
  const mainPlaces = MAIN_ROUTE_PLACE_IDS.map((id) => getPlaceById(id)).filter(
    (p): p is Place => !!p
  );
  const schedule = buildSchedule(mainPlaces);
  const totalMinutes = schedule.totalTravelMinutes + schedule.totalDwellMinutes;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-bold tracking-wide text-fuchsia-600 dark:bg-fuchsia-950 dark:text-fuchsia-300">
          STARA
        </span>
        <h1 className="bg-gradient-to-r from-fuchsia-600 to-indigo-500 bg-clip-text text-4xl font-extrabold text-transparent">
          스타 따라 STARA
        </h1>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          좋아하는 K-pop 아티스트의 발자취를 따라, 서울을 게임처럼 여행하세요.
        </p>
      </header>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex h-32 items-center justify-center bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-500">
          <MapPinned size={44} className="text-white/90" />
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-xs font-semibold text-fuchsia-500">서울 대표 코스</p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {SEOUL_MAIN_ROUTE.nameKo}
            </h2>
          </div>

          <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <Clock size={16} className="text-fuchsia-500" />
              약 {Math.round(totalMinutes / 60)}시간 소요
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-fuchsia-500" />
              주요 체크포인트 {mainPlaces.length}곳
            </div>
          </div>

          <Link
            href="/main-route"
            className="flex min-h-11 items-center justify-center rounded-xl bg-fuchsia-600 text-sm font-bold text-white transition-colors hover:bg-fuchsia-700"
          >
            서울 코스 만들기
          </Link>
        </div>
      </section>
    </main>
  );
}
