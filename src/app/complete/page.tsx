"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTripPlan } from "@/store/useTripPlan";
import { useTripStore } from "@/store/tripStore";

export default function CompletePage() {
  const router = useRouter();
  const [step, setStep] = useState<"trophy" | "diary-prompt">("trophy");
  const completedAt = useTripStore((s) => s.completedAt);
  const activeTripName = useTripStore((s) => s.activeTripName);
  const earnedStampIds = useTripStore((s) => s.earnedStampIds);
  const resetTrip = useTripStore((s) => s.resetTrip);
  const { orderedPlaces } = useTripPlan();

  // travel/page.tsx와 동일한 이유로, 반응형 값 대신 getState()로 실제 복원된
  // 값을 확인한 뒤에만 리다이렉트 여부를 판단한다.
  useEffect(() => {
    if (!useTripStore.getState().completedAt) {
      router.replace("/");
    }
  }, [router]);

  if (!completedAt) return null;

  function goToDiary() {
    // 여기서 resetTrip()을 부르면 /trip의 하이드레이션 가드가 "루트 없음"으로 보고
    // 곧장 "/"로 돌려보내버린다 — 다이어리를 보여준 뒤, 새 루트를 시작할 때
    // (Cover 탭의 "+ Create New Route" → setMainRoute)가 되어야 실제로 초기화된다.
    router.push("/trip?tab=diary");
  }

  function skip() {
    resetTrip();
    router.push("/");
  }

  return (
    <main className="font-jakarta text-stara-navy flex min-h-screen flex-col items-center justify-center gap-4 bg-stara-bg px-8 text-center">
      {step === "trophy" ? (
        <>
          <span className="text-[52px]">🏆</span>
          <h1 className="font-fraunces text-2xl font-bold">Route Complete!</h1>
          <p className="text-sm text-stone-500">
            {activeTripName ?? "이번 루트"}의 모든 체크포인트를 완료했어요.
          </p>
          <div className="my-4 flex h-[90px] w-[90px] items-center justify-center rounded-3xl border-[3px] border-stara-primary bg-gradient-to-br from-stara-coral to-stara-navy text-4xl shadow-[0_16px_30px_-12px_rgba(255,143,122,0.6)]">
            🎬
          </div>
          <p className="mb-2 text-sm text-stone-500">
            획득 스탬프 {earnedStampIds.length}개 · 방문 장소 {orderedPlaces.length}곳
          </p>
          <button
            type="button"
            onClick={() => setStep("diary-prompt")}
            className="mt-2 flex min-h-11 w-full items-center justify-center rounded-2xl bg-stara-coral text-sm font-bold text-white"
          >
            Receive Stamp →
          </button>
        </>
      ) : (
        <>
          <h1 className="font-fraunces text-2xl font-bold">Your trip diary is ready</h1>
          <p className="text-sm text-stone-500">체크인한 인증샷으로 여행 다이어리를 만들었어요.</p>

          <div className="relative my-5 flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 text-left shadow-[0_10px_22px_-14px_rgba(36,59,83,0.3)]">
            <span className="font-space-mono absolute -left-2 -top-2 rounded-full bg-stara-mint px-2 py-0.5 text-[9px] font-bold shadow">
              NEW!
            </span>
            <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-stara-coral to-stara-navy text-2xl">
              📔
            </span>
            <div>
              <b className="text-sm">{activeTripName ?? "STARA Trip"}</b>
              <p className="font-space-mono mt-0.5 text-[9px] text-stone-500">
                {orderedPlaces.length}개 체크포인트 · {earnedStampIds.length}장의 사진
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={goToDiary}
            className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-stara-navy text-sm font-bold text-white"
          >
            View Diary
          </button>
          <button
            type="button"
            onClick={skip}
            className="flex min-h-11 w-full items-center justify-center rounded-2xl border-2 border-stone-200 text-sm font-bold"
          >
            Skip for now
          </button>
        </>
      )}
    </main>
  );
}
