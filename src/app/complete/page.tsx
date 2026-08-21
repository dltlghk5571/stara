"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTripPlan } from "@/store/useTripPlan";
import { useTripStore } from "@/store/tripStore";

export default function CompletePage() {
  const router = useRouter();
  const [step, setStep] = useState<"complete" | "diary-prompt">("complete");
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

  if (step === "complete") {
    return (
      <div id="tv-complete" className="tl-view">
        <div className="complete-emoji">🏆</div>
        <div className="flow-h1" style={{ fontSize: "23px" }}>
          Route Complete!
        </div>
        <div className="flow-sub">{activeTripName ?? "이번 루트"}의 모든 체크포인트를 완료했어요.</div>
        <div className="completion-stamp">🎬</div>
        <div className="flow-sub" style={{ marginBottom: "18px" }}>
          획득 스탬프 {earnedStampIds.length}개 · 방문 장소 {orderedPlaces.length}곳
        </div>
        <button className="btn btn-coral" onClick={() => setStep("diary-prompt")}>
          Receive Stamp →
        </button>
      </div>
    );
  }

  return (
    <div id="tv-diary-prompt" className="tl-view">
      <div className="flow-h1">Your trip diary is ready</div>
      <div className="flow-sub">체크인한 인증샷으로 여행 다이어리를 만들었어요.</div>
      <div className="diary-preview-card">
        <div className="new-badge">NEW!</div>
        <div className="thumb">📔</div>
        <div>
          <b style={{ fontSize: "13px" }}>{activeTripName ?? "STARA Trip"}</b>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "var(--gray)", marginTop: "3px" }}>
            {orderedPlaces.length} entries · {earnedStampIds.length} photos
          </div>
        </div>
      </div>
      <button className="btn btn-navy" style={{ marginBottom: "10px" }} onClick={goToDiary}>
        View Diary
      </button>
      <button className="btn btn-outline" onClick={skip}>
        Skip for now
      </button>
    </div>
  );
}
