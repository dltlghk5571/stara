"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, Info } from "lucide-react";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";
import { useTripPlan } from "@/store/useTripPlan";
import { useTripStore } from "@/store/tripStore";
import TopBar from "@/components/layout/TopBar";
import MapView from "@/components/map/MapView";
import ScheduleFooter from "@/components/route/ScheduleFooter";

export default function FinalRoutePage() {
  const router = useRouter();
  const {
    orderedPlaces,
    schedule,
    selectedArtistIds,
    autoAddReasons,
    removalSuggestion,
    routeGeometry,
  } = useTripPlan();
  const removePlace = useTripStore((s) => s.removePlace);
  const startTrip = useTripStore((s) => s.startTrip);

  const foodCount = orderedPlaces.filter((p) => p.isFood).length;
  const hasLocalTourism = orderedPlaces.some((p) => p.isLocalSpot && !p.isFood);
  const requiredQuestCount = orderedPlaces.length;
  const subQuestCount = schedule.stops.filter((s) => s.segmentQuest).length;

  function handleStart() {
    if (schedule.isOverLimit) return;
    startTrip();
    router.push("/travel");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="최종 루트 확인" backHref="/edit" />

      <div className="h-64 w-full shrink-0 sm:h-80">
        <MapView
          pins={orderedPlaces.map((p, i) => ({
            id: p.id,
            lat: p.latitude,
            lng: p.longitude,
            order: i + 1,
            color: CATEGORY_STYLE[p.category].color,
            title: p.nameKo,
          }))}
          showPath
          routeGeometry={routeGeometry.length > 0 ? routeGeometry : undefined}
        />
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-700 sm:grid-cols-4">
          <Stat label="총 이동시간" value={`${schedule.totalTravelMinutes}분`} />
          <Stat label="총 체류시간" value={`${schedule.totalDwellMinutes}분`} />
          <Stat label="예상 종료시각" value={schedule.endTime} />
          <Stat label="포함 아티스트" value={`${selectedArtistIds.length}명`} />
          <Stat label="로컬 관광지" value={hasLocalTourism ? "포함" : "미포함"} />
          <Stat label="음식점" value={`${foodCount}곳`} />
          <Stat label="필수 퀘스트" value={`${requiredQuestCount}개`} />
          <Stat label="서브 퀘스트" value={`${subQuestCount}개`} />
        </div>

        {autoAddReasons.length > 0 && (
          <div className="flex flex-col gap-2 rounded-2xl bg-fuchsia-50 p-4 text-xs text-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-200">
            {autoAddReasons.map((r) => (
              <div key={r.placeId} className="flex items-start gap-2">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>{r.reasonKo}</span>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            시간표
          </p>
          <ol className="flex flex-col gap-2">
            {schedule.stops.map((stop) => (
              <li
                key={stop.place.id}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="flex items-center gap-3">
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
                      도착 {stop.arrival} · 출발 {stop.departure} · 체류{" "}
                      {stop.place.dwellMinutes}분
                    </p>
                    {stop.isOpenTimeConflict && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-rose-500">
                        <AlertTriangle size={12} /> 운영시간을 벗어난 도착이에요
                      </p>
                    )}
                  </div>
                </div>
                {stop.order < schedule.stops.length && (
                  <p className="ml-11 mt-1.5 text-xs text-slate-400">
                    다음 장소까지 이동 약 {Math.round(
                      schedule.stops[stop.order]?.travelMinutesFromPrev ?? 0
                    )}
                    분
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </main>

      <ScheduleFooter
        schedule={schedule}
        removalSuggestion={removalSuggestion}
        onRemoveSuggestion={
          removalSuggestion ? () => removePlace(removalSuggestion.place.id) : undefined
        }
      />

      <button
        type="button"
        onClick={handleStart}
        disabled={schedule.isOverLimit}
        className="m-3 flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-600 text-sm font-bold text-white transition-colors hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {schedule.isOverLimit ? "오후 9시를 초과해 시작할 수 없어요" : "여행 시작"}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
