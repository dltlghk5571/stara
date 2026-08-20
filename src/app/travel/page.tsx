"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, PartyPopper } from "lucide-react";
import { getQuestsForPlace } from "@/data/quests";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";
import { useTripPlan } from "@/store/useTripPlan";
import { useTripStore } from "@/store/tripStore";
import TopBar from "@/components/layout/TopBar";
import AuthNav from "@/components/layout/AuthNav";
import QuestChecklist from "@/components/quest/QuestChecklist";
import QuestPhotoUpload from "@/components/quest/QuestPhotoUpload";
import SubQuestList from "@/components/quest/SubQuestList";

export default function TravelPage() {
  const router = useRouter();
  const startedAt = useTripStore((s) => s.startedAt);
  const completedQuestIds = useTripStore((s) => s.completedQuestIds);
  const earnedStampIds = useTripStore((s) => s.earnedStampIds);
  const toggleQuest = useTripStore((s) => s.toggleQuest);
  const claimStamp = useTripStore((s) => s.claimStamp);
  const completeTrip = useTripStore((s) => s.completeTrip);

  const { orderedPlaces, schedule } = useTripPlan();

  // zustand persist가 localStorage에서 상태를 복원하기 전, React의 SSR-일치용 첫
  // 클라이언트 렌더는 항상 초기값(startedAt=null)을 반환한다(useSyncExternalStore가
  // getServerSnapshot을 우선하기 때문). 그 값으로 바로 리다이렉트하면 새로고침마다
  // "미시작"으로 오판하므로, effect 안에서는 반응형 값 대신 getState()로 실제
  // 복원된 값을 다시 확인한 뒤에만 이동한다. 화면 표시용 startedAt은 하이드레이션이
  // 끝나는 다음 렌더에서 스스로 올바른 값으로 갱신된다.
  useEffect(() => {
    if (!useTripStore.getState().startedAt) {
      router.replace("/final");
    }
  }, [router]);

  const currentIndex = orderedPlaces.findIndex(
    (p) => !earnedStampIds.includes(`stamp-${p.id}`)
  );
  const allDone = currentIndex === -1;
  const progress = orderedPlaces.length
    ? earnedStampIds.length / orderedPlaces.length
    : 0;

  if (!startedAt) return null;

  if (allDone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <PartyPopper size={48} className="text-amber-500" />
        <p className="text-lg font-bold">모든 체크포인트를 완료했어요!</p>
        <button
          type="button"
          onClick={() => {
            completeTrip();
            router.push("/complete");
          }}
          className="flex min-h-11 items-center justify-center rounded-xl bg-fuchsia-600 px-6 text-sm font-bold text-white hover:bg-fuchsia-700"
        >
          여행 완료 화면 보기
        </button>
      </div>
    );
  }

  const currentStop = schedule.stops[currentIndex];
  const nextStop = schedule.stops[currentIndex + 1];
  const requiredQuests = getQuestsForPlace(currentStop.place).filter(
    (q) => q.required
  );

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="여행 진행 중" backHref="/stamps" rightSlot={<AuthNav />} />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>전체 진행률</span>
            <span>
              {earnedStampIds.length} / {orderedPlaces.length}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-fuchsia-500 transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        <section className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/50 p-4 dark:border-fuchsia-900 dark:bg-fuchsia-950/20">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: CATEGORY_STYLE[currentStop.place.category].color }}
          >
            현재 체크포인트 · {currentStop.order}번째
          </span>
          <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {currentStop.place.nameKo}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {currentStop.place.relationTextKo}
          </p>

          <div className="mt-4">
            <QuestChecklist
              quests={requiredQuests}
              completedQuestIds={completedQuestIds}
              onToggle={toggleQuest}
              stampClaimed={earnedStampIds.includes(`stamp-${currentStop.place.id}`)}
              onClaimStamp={() => claimStamp(currentStop.place)}
            />
            <div className="mt-2">
              <QuestPhotoUpload placeId={currentStop.place.id} />
            </div>
          </div>
        </section>

        {nextStop && (
          <section className="flex flex-col gap-3">
            <div className="rounded-2xl border border-dashed border-slate-300 p-3 text-sm dark:border-slate-600">
              <p className="text-xs font-semibold text-slate-400">다음 장소</p>
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                {nextStop.place.nameKo}
              </p>
              <p className="text-xs text-slate-400">
                이동 약 {Math.round(nextStop.travelMinutesFromPrev)}분
              </p>
            </div>
            {nextStop.segmentQuest && (
              <SubQuestList
                quest={nextStop.segmentQuest}
                completedQuestIds={completedQuestIds}
                onToggle={toggleQuest}
              />
            )}
          </section>
        )}

        <section>
          <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            전체 장소 목록
          </p>
          <ul className="flex flex-col gap-1.5">
            {orderedPlaces.map((p, i) => {
              const done = earnedStampIds.includes(`stamp-${p.id}`);
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    i === currentIndex
                      ? "bg-fuchsia-100 dark:bg-fuchsia-950/40"
                      : ""
                  }`}
                >
                  {done ? (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  ) : (
                    <Circle size={16} className="text-slate-300" />
                  )}
                  <span
                    className={done ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}
                  >
                    {i + 1}. {p.nameKo}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
