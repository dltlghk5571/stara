"use client";

import { getQuestsForPlace } from "@/data/quests";
import { useTripPlan } from "@/store/useTripPlan";
import { useTripStore } from "@/store/tripStore";
import TopBar from "@/components/layout/TopBar";
import AuthNav from "@/components/layout/AuthNav";
import StampGrid from "@/components/stamp/StampGrid";

export default function StampsPage() {
  const completedQuestIds = useTripStore((s) => s.completedQuestIds);
  const earnedStampIds = useTripStore((s) => s.earnedStampIds);
  const { orderedPlaces, schedule } = useTripPlan();

  const requiredQuestIds = orderedPlaces.flatMap((p) =>
    getQuestsForPlace(p)
      .filter((q) => q.required)
      .map((q) => q.id)
  );
  const requiredDone = requiredQuestIds.filter((id) =>
    completedQuestIds.includes(id)
  ).length;

  const subQuestIds = schedule.stops
    .map((s) => s.segmentQuest?.id)
    .filter((id): id is string => !!id);
  const subQuestDone = subQuestIds.filter((id) =>
    completedQuestIds.includes(id)
  ).length;

  const completionRate = orderedPlaces.length
    ? Math.round((earnedStampIds.length / orderedPlaces.length) * 100)
    : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="스탬프북" backHref="/travel" rightSlot={<AuthNav />} />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-6">
        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 p-4 text-center text-sm dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-400">여행 완료율</p>
            <p className="text-lg font-bold text-fuchsia-600">{completionRate}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">필수 퀘스트</p>
            <p className="text-lg font-bold">
              {requiredDone}/{requiredQuestIds.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">보너스 서브 퀘스트</p>
            <p className="text-lg font-bold">
              {subQuestDone}/{subQuestIds.length}
            </p>
          </div>
        </div>

        <StampGrid orderedPlaces={orderedPlaces} earnedStampIds={earnedStampIds} />
      </main>
    </div>
  );
}
