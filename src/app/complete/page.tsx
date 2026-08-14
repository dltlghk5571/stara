"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { useTripPlan } from "@/store/useTripPlan";
import { useTripStore } from "@/store/tripStore";

export default function CompletePage() {
  const router = useRouter();
  const completedAt = useTripStore((s) => s.completedAt);
  const completedQuestIds = useTripStore((s) => s.completedQuestIds);
  const earnedStampIds = useTripStore((s) => s.earnedStampIds);
  const resetTrip = useTripStore((s) => s.resetTrip);
  const { orderedPlaces, schedule, selectedArtistIds } = useTripPlan();

  // travel/page.tsx와 동일한 이유로, 반응형 값 대신 getState()로 실제 복원된
  // 값을 확인한 뒤에만 리다이렉트 여부를 판단한다.
  useEffect(() => {
    if (!useTripStore.getState().completedAt) {
      router.replace("/");
    }
  }, [router]);

  if (!completedAt) return null;

  const subQuestIds = schedule.stops
    .map((s) => s.segmentQuest?.id)
    .filter((id): id is string => !!id);
  const subQuestDone = subQuestIds.filter((id) =>
    completedQuestIds.includes(id)
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-6 px-5 py-10 text-center">
      <PartyPopper size={52} className="text-amber-500" />
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
        서울 STARA 루트를 완주했습니다!
      </h1>

      <div className="grid w-full grid-cols-2 gap-3 rounded-2xl border border-slate-200 p-5 text-sm dark:border-slate-700">
        <Stat label="방문 장소" value={`${orderedPlaces.length}곳`} />
        <Stat label="체험한 아티스트" value={`${selectedArtistIds.length}명`} />
        <Stat label="획득 스탬프" value={`${earnedStampIds.length}개`} />
        <Stat label="완료한 서브 퀘스트" value={`${subQuestDone}개`} />
      </div>

      <div className="w-full rounded-2xl border border-slate-200 p-5 text-left dark:border-slate-700">
        <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          최종 여행 경로 요약
        </p>
        <ol className="flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-400">
          {orderedPlaces.map((p, i) => (
            <li key={p.id}>
              {i + 1}. {p.nameKo}
            </li>
          ))}
        </ol>
      </div>

      <a
        href="/collection"
        className="flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-fuchsia-600 px-6 text-sm font-bold text-fuchsia-600 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/30"
      >
        내 컬렉션북 보기
      </a>

      <button
        type="button"
        onClick={() => {
          resetTrip();
          router.push("/");
        }}
        className="flex min-h-11 items-center justify-center rounded-xl bg-fuchsia-600 px-6 text-sm font-bold text-white hover:bg-fuchsia-700"
      >
        처음으로 돌아가기
      </button>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
