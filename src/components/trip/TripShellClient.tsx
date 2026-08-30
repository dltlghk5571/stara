"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTripStore } from "@/store/tripStore";
import { useTripPlan } from "@/store/useTripPlan";
import { getPlaceById } from "@/data/places";
import { levelFromStamps, nextRewardLabel } from "@/lib/gamification";
import MapView from "@/components/map/MapView";
import StampGrid from "@/components/stamp/StampGrid";
import MissionSheet from "@/components/trip/MissionSheet";
import SubQuestList from "@/components/quest/SubQuestList";
import { BottomNav, KButton, KCard, Pill } from "@/components/ui/kroute";
import type { KrouteTab } from "@/components/ui/kroute";
import { CYAN, LBLUE, LIME, MUTED_PINK, PALGREEN, PINK, WHITE, YELLOW } from "@/lib/kroute-tokens";
import type { Place, Quest } from "@/types";

export interface DiaryPhoto {
  id: string;
  placeId: string;
  /** 촬영 시점 장소명 스냅샷. 이 필드 도입 이전 사진은 null — resolvePlaceName이 폴백한다. */
  placeName?: string | null;
  photoUrl: string;
  note: string | null;
  completedAt: string;
  tripId: string | null;
  tripName: string | null;
}

const NO_PLACE_INFO = "장소 정보 없음";

/** placeId → 장소명 우선순위: 사진 스냅샷 → 현재 trip/route 동적 장소 → static PLACES → 최종 폴백.
 *  raw placeId(예: kto-*)는 어떤 경로로도 화면에 노출하지 않는다. */
function resolvePlaceName(photo: DiaryPhoto, dynamicPlacesById: Map<string, Place>): string {
  if (photo.placeName) return photo.placeName;
  const dynamic = dynamicPlacesById.get(photo.placeId);
  if (dynamic) return dynamic.nameKo;
  const staticPlace = getPlaceById(photo.placeId);
  if (staticPlace) return staticPlace.nameKo;
  return NO_PLACE_INFO;
}

export interface TripGroup {
  key: string;
  name: string;
  photos: DiaryPhoto[];
}

type Tab = KrouteTab;

interface Props {
  initialDiaryGroups: TripGroup[];
  initialTab?: Tab;
}

export default function TripShellClient({ initialDiaryGroups, initialTab }: Props) {
  const router = useRouter();
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>(initialTab ?? "cover");
  const [missionPlace, setMissionPlace] = useState<Place | null>(null);
  const [sessionPhotos, setSessionPhotos] = useState<DiaryPhoto[]>([]);

  const activeTripId = useTripStore((s) => s.activeTripId);
  const activeTripName = useTripStore((s) => s.activeTripName);
  const earnedStampIds = useTripStore((s) => s.earnedStampIds);
  const completedQuestIds = useTripStore((s) => s.completedQuestIds);
  const toggleQuest = useTripStore((s) => s.toggleQuest);
  const startedAt = useTripStore((s) => s.startedAt);
  const mainRoutePlaces = useTripStore((s) => s.mainRoutePlaces);
  const customPlaces = useTripStore((s) => s.customPlaces);
  const startTrip = useTripStore((s) => s.startTrip);
  const completeTrip = useTripStore((s) => s.completeTrip);

  const { orderedPlaces, schedule } = useTripPlan();

  // Diary 사진의 placeId를 이름으로 풀 때 쓰는 "현재 trip/route에 있는 동적 장소" 소스.
  // orderedPlaces(현재 루트) > mainRoutePlaces > customPlaces(둘 다 persisted) 순으로 채움 —
  // resolvePlaceName의 우선순위 2/3단계에 대응.
  const dynamicPlacesById = new Map<string, Place>();
  for (const p of orderedPlaces) dynamicPlacesById.set(p.id, p);
  for (const p of mainRoutePlaces ?? []) if (!dynamicPlacesById.has(p.id)) dynamicPlacesById.set(p.id, p);
  for (const p of customPlaces) if (!dynamicPlacesById.has(p.id)) dynamicPlacesById.set(p.id, p);

  // /travel, /complete와 동일한 하이드레이션 가드 패턴: zustand persist가 localStorage에서
  // 복원되기 전 첫 렌더는 항상 초기값을 반환하므로(useSyncExternalStore가 SSR 스냅샷을
  // 우선함), 반응형 값이 아니라 getState()로 실제 복원된 값을 effect 안에서 다시 확인한
  // 뒤에만 리다이렉트/자동시작한다.
  useEffect(() => {
    const state = useTripStore.getState();
    if (!state.mainRoutePlaces && !state.startedAt) {
      router.replace("/");
      return;
    }
    if (!state.startedAt) startTrip();
  }, [router, startTrip]);

  if (!startedAt && !mainRoutePlaces) return null;

  const currentIndex = orderedPlaces.findIndex(
    (p) => !earnedStampIds.includes(`stamp-${p.id}`)
  );
  const allDone = currentIndex === -1;

  function statusOf(i: number): "done" | "next" | "locked" {
    if (allDone || i < currentIndex) return "done";
    if (i === currentIndex) return "next";
    return "locked";
  }

  function openMission(i: number) {
    if (i !== currentIndex) return;
    setMissionPlace(orderedPlaces[i]);
  }

  function handleMissionComplete(photo: DiaryPhoto) {
    setSessionPhotos((prev) => [photo, ...prev]);
    setMissionPlace(null);
    const stillRemaining = orderedPlaces.some(
      (p) => !useTripStore.getState().earnedStampIds.includes(`stamp-${p.id}`)
    );
    if (!stillRemaining) {
      completeTrip();
      router.push("/complete");
    }
  }

  const diaryGroups = mergeSessionIntoGroups(initialDiaryGroups, sessionPhotos, activeTripId, activeTripName);
  const holderName = user?.fullName || user?.username || "STARA Traveler";

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#FAF6EF" }}>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {tab === "cover" && (
          <CoverTab
            holderName={holderName}
            activeTripName={activeTripName}
            earnedCount={earnedStampIds.length}
            totalCount={orderedPlaces.length}
            onContinue={() => setTab("route")}
            onCreateNew={() => router.push("/onboarding/artists")}
            onEdit={() => router.push("/edit")}
          />
        )}

        {tab === "stamps" && (
          <StampsTab orderedPlaces={orderedPlaces} earnedStampIds={earnedStampIds} />
        )}

        {tab === "route" && (
          <RouteTab
            orderedPlaces={orderedPlaces}
            statusOf={statusOf}
            allDone={allDone}
            segmentQuest={
              currentIndex >= 0 ? schedule.stops[currentIndex]?.segmentQuest : undefined
            }
            completedQuestIds={completedQuestIds}
            onToggleSubQuest={toggleQuest}
            onOpenMission={openMission}
            onFinish={() => {
              completeTrip();
              router.push("/complete");
            }}
          />
        )}

        {tab === "diary" && <DiaryTab groups={diaryGroups} dynamicPlacesById={dynamicPlacesById} />}
      </div>

      <BottomNav active={tab} onChange={setTab} />

      {missionPlace && (
        <MissionSheet
          place={missionPlace}
          onClose={() => setMissionPlace(null)}
          onComplete={handleMissionComplete}
        />
      )}
    </div>
  );
}

function mergeSessionIntoGroups(
  initial: TripGroup[],
  session: DiaryPhoto[],
  activeTripId: string | null,
  activeTripName: string | null
): TripGroup[] {
  if (session.length === 0) return initial;
  const key = activeTripId ?? "legacy";
  const existingIndex = initial.findIndex((g) => g.key === key);
  const merged = initial.map((g) => ({ ...g, photos: [...g.photos] }));
  if (existingIndex >= 0) {
    merged[existingIndex] = {
      ...merged[existingIndex],
      photos: [...session, ...merged[existingIndex].photos],
    };
  } else {
    merged.unshift({ key, name: activeTripName ?? "이번 여행", photos: session });
  }
  return merged;
}

function CoverTab({
  holderName,
  activeTripName,
  earnedCount,
  totalCount,
  onContinue,
  onCreateNew,
  onEdit,
}: {
  holderName: string;
  activeTripName: string | null;
  earnedCount: number;
  totalCount: number;
  onContinue: () => void;
  onCreateNew: () => void;
  onEdit: () => void;
}) {
  const pct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;
  return (
    <div className="kr-scrollY" style={{ height: "100%", padding: "48px 24px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: PINK,
            border: "2.5px solid #111111",
            boxShadow: "3px 3px 0 #111111",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Outfit",
            fontWeight: 900,
            fontSize: 18,
            color: WHITE,
          }}
        >
          K
        </div>
        <div>
          <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 11, color: "#888", letterSpacing: 1 }}>WELCOME BACK!</p>
          <div style={{ marginTop: 3 }}>
            <Pill bg={CYAN}>✦ {holderName}</Pill>
          </div>
        </div>
      </div>

      <h1 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 24, lineHeight: 1.2 }}>
        K-CONTENT TRAVEL PASSPORT
      </h1>
      <p style={{ fontFamily: "Caveat", fontSize: 18, color: "#888", fontStyle: "italic", marginTop: 4, marginBottom: 16 }}>
        Your journey continues…
      </p>

      {activeTripName && (
        <KCard style={{ padding: 0, overflow: "hidden", background: LBLUE, marginBottom: 14 }}>
          <div style={{ padding: "14px 16px", borderBottom: "2.5px solid #111111", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 14 }}>Active Route</span>
            <Pill bg={WHITE} style={{ fontSize: 10 }}>IN PROGRESS</Pill>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{activeTripName}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontFamily: "Nunito", fontSize: 13, fontWeight: 600, color: "#555" }}>Mission Progress</span>
              <span style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 13 }}>{earnedCount}/{totalCount}</span>
            </div>
            <div style={{ height: 6, borderRadius: 50, border: "1.5px solid #111111", overflow: "hidden", background: "#f0f0f0" }}>
              <div style={{ height: "100%", background: PINK, borderRadius: 50, width: `${pct}%`, transition: "width .5s" }} />
            </div>
          </div>
        </KCard>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <KButton bg={LIME} color="#111" onClick={onContinue}>
          {earnedCount === totalCount && totalCount > 0 ? "VIEW ROUTE ✓" : "CONTINUE →"}
        </KButton>
        <KButton bg={PINK} color={WHITE} onClick={onCreateNew}>
          + CREATE NEW ROUTE
        </KButton>
        <KButton outline onClick={onEdit}>
          루트 직접 편집하기
        </KButton>
      </div>
    </div>
  );
}

function StampsTab({ orderedPlaces, earnedStampIds }: { orderedPlaces: Place[]; earnedStampIds: string[] }) {
  const level = levelFromStamps(earnedStampIds.length);
  const reward = nextRewardLabel(earnedStampIds.length);
  return (
    <div className="kr-scrollY" style={{ height: "100%", padding: "48px 24px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 24 }}>Mission Stamps</h2>
        <Pill bg={CYAN}>LEVEL {level}</Pill>
      </div>
      <p style={{ fontFamily: "Caveat", fontSize: 18, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Collect &apos;em all to level up! 🎌
      </p>

      <KCard style={{ overflow: "hidden", background: "#F0E8FF", marginBottom: 14 }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 28, lineHeight: 1 }}>
              {earnedStampIds.length} / {orderedPlaces.length}
            </p>
            <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#666", marginTop: 3 }}>미션을 완료할 때마다 스탬프가 쌓여요</p>
          </div>
          <div style={{ width: 1.5, height: 44, background: "rgba(0,0,0,.12)", margin: "0 16px" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 13, color: PINK }}>Next Reward:</p>
            <p style={{ fontFamily: "Nunito", fontWeight: 700, fontSize: 13 }}>{reward} 🎉</p>
          </div>
        </div>
      </KCard>

      <StampGrid orderedPlaces={orderedPlaces} earnedStampIds={earnedStampIds} />
    </div>
  );
}

function RouteTab({
  orderedPlaces,
  statusOf,
  allDone,
  segmentQuest,
  completedQuestIds,
  onToggleSubQuest,
  onOpenMission,
  onFinish,
}: {
  orderedPlaces: Place[];
  statusOf: (i: number) => "done" | "next" | "locked";
  allDone: boolean;
  segmentQuest?: Quest;
  completedQuestIds: string[];
  onToggleSubQuest: (questId: string) => void;
  onOpenMission: (i: number) => void;
  onFinish: () => void;
}) {
  const doneCount = orderedPlaces.filter((_, i) => statusOf(i) === "done").length;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "48px 24px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 15, flex: 1 }}>다음 체크포인트를 탭해서 미션 진행</span>
          <Pill bg={LIME}>🏅 {doneCount}/{orderedPlaces.length}</Pill>
        </div>
      </div>

      <div style={{ height: 180, margin: "0 24px 14px", borderRadius: 16, border: "2.5px solid #111111", overflow: "hidden", flexShrink: 0 }}>
        <MapView
          pins={orderedPlaces.map((p, i) => ({
            id: p.id,
            lat: p.latitude,
            lng: p.longitude,
            order: i + 1,
            color: "#111111",
            title: p.nameKo,
            status: statusOf(i),
          }))}
          showPath
          onPinClick={(id) => {
            const i = orderedPlaces.findIndex((p) => p.id === id);
            if (i >= 0) onOpenMission(i);
          }}
        />
      </div>

      {segmentQuest && (
        <div style={{ padding: "0 24px", marginBottom: 10, flexShrink: 0 }}>
          <SubQuestList quest={segmentQuest} completedQuestIds={completedQuestIds} onToggle={onToggleSubQuest} />
        </div>
      )}

      <div className="kr-scrollY" style={{ flex: 1, padding: "0 24px 8px" }}>
        <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 16, marginBottom: 12 }}>Missions Checklist</p>
        {orderedPlaces.map((p, i) => {
          const status = statusOf(i);
          const active = status === "next";
          return (
            <button
              key={p.id}
              type="button"
              className="kr-reset"
              onClick={active ? () => onOpenMission(i) : undefined}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 14px",
                borderRadius: 14,
                border: "2.5px solid #111111",
                marginBottom: 8,
                background: status === "done" ? PALGREEN : active ? YELLOW : WHITE,
                boxShadow: active ? "4px 4px 0 #111111" : "2px 2px 0 #111111",
                cursor: active ? "pointer" : "default",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: status === "done" ? LIME : active ? WHITE : "#f0f0f0",
                  border: `2px solid ${status === "locked" ? "#ccc" : "#111111"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                {status === "locked" ? "🔒" : status === "done" ? "✓" : "⏳"}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 14, color: status === "locked" ? "#aaa" : "#111", marginBottom: 2 }}>
                  {p.nameKo}
                </p>
                <p style={{ fontFamily: "Nunito", fontSize: 12, fontWeight: 700, color: status === "done" ? "#555" : active ? "#333" : "#bbb" }}>
                  {status === "done" ? "Mission Complete ✓" : active ? "GO NOW!" : "LOCKED"}
                </p>
              </div>
              {active && <Pill bg={PINK} color={WHITE}>GO! 🎯</Pill>}
            </button>
          );
        })}

        {allDone && orderedPlaces.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <KButton bg={PINK} color={WHITE} onClick={onFinish}>
              모든 체크포인트 완료 — 여행 마무리하기
            </KButton>
          </div>
        )}
      </div>
    </div>
  );
}

function DiaryTab({ groups, dynamicPlacesById }: { groups: TripGroup[]; dynamicPlacesById: Map<string, Place> }) {
  const [activeKey, setActiveKey] = useState(groups[0]?.key ?? null);
  const active = groups.find((g) => g.key === activeKey) ?? groups[0];
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (groups.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 24 }}>My K-ROUTE Diary</h2>
        <p style={{ fontFamily: "Nunito", fontSize: 13, color: "#888", marginTop: 12 }}>첫 미션을 완료하면 다이어리가 채워져요.</p>
      </div>
    );
  }

  const days = groupByDay(active.photos);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "48px 24px 12px", flexShrink: 0 }}>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 24 }}>My K-ROUTE Diary</h2>
        <p style={{ fontFamily: "Caveat", fontSize: 17, color: MUTED_PINK, fontStyle: "italic", marginTop: 2 }}>여행 기록 & 순간들 ✨</p>
      </div>

      {groups.length > 1 && (
        <div style={{ display: "flex", gap: 8, padding: "0 24px 12px", flexShrink: 0, overflowX: "auto" }}>
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              className="kr-reset"
              onClick={() => setActiveKey(g.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 50,
                border: "2.5px solid #111111",
                background: g.key === active.key ? PINK : WHITE,
                color: g.key === active.key ? WHITE : "#111",
                fontFamily: "Outfit",
                fontWeight: 700,
                fontSize: 12,
                whiteSpace: "nowrap",
              }}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div className="kr-scrollY" style={{ flex: 1, padding: "0 24px 8px" }}>
        {days.map(([day, photos]) => (
          <div key={day} style={{ marginBottom: 8 }}>
            <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 13, color: "#888", marginBottom: 8 }}>{day}</p>
            {photos.map((photo) => (
              <KCard
                key={photo.id}
                onClick={() => setViewerIndex(active.photos.findIndex((p) => p.id === photo.id))}
                style={{ marginBottom: 16, padding: 0, overflow: "hidden", cursor: "pointer" }}
              >
                <div style={{ height: 160, position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent,rgba(0,0,0,.35))" }} />
                  <div style={{ position: "absolute", bottom: 8, left: 12 }}>
                    <Pill bg={WHITE}>📍 {resolvePlaceName(photo, dynamicPlacesById)}</Pill>
                  </div>
                </div>
                {photo.note && (
                  <div style={{ padding: "12px 16px" }}>
                    <p style={{ fontFamily: "Caveat", fontSize: 16, fontStyle: "italic", color: MUTED_PINK, lineHeight: 1.4 }}>
                      &quot;{photo.note}&quot;
                    </p>
                  </div>
                )}
              </KCard>
            ))}
          </div>
        ))}
      </div>

      {viewerIndex !== null && (
        <DiaryViewer
          photos={active.photos}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          dynamicPlacesById={dynamicPlacesById}
        />
      )}
    </div>
  );
}

function DiaryViewer({
  photos,
  index,
  onIndexChange,
  onClose,
  dynamicPlacesById,
}: {
  photos: DiaryPhoto[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  dynamicPlacesById: Map<string, Place>;
}) {
  const photo = photos[index];
  const touchStartX = useRef<number | null>(null);

  const goPrev = useCallback(() => {
    if (index > 0) onIndexChange(index - 1);
  }, [index, onIndexChange]);
  const goNext = useCallback(() => {
    if (index < photos.length - 1) onIndexChange(index + 1);
  }, [index, onIndexChange, photos.length]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext, onClose]);

  if (!photo) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,.9)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (delta > 50) goPrev();
        else if (delta < -50) goNext();
      }}
    >
      <button
        type="button"
        className="kr-reset"
        onClick={onClose}
        style={{ position: "absolute", top: 20, right: 20, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 16 }}
      >
        ✕
      </button>

      <div style={{ position: "relative", width: "100%", maxWidth: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {index > 0 && (
          <button
            type="button"
            className="kr-reset"
            onClick={goPrev}
            aria-label="이전 사진"
            style={{ position: "absolute", left: 8, zIndex: 10, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,.4)", color: "#fff", fontSize: 18 }}
          >
            ‹
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.photoUrl} alt="" style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 12 }} />
        {index < photos.length - 1 && (
          <button
            type="button"
            className="kr-reset"
            onClick={goNext}
            aria-label="다음 사진"
            style={{ position: "absolute", right: 8, zIndex: 10, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,.4)", color: "#fff", fontSize: 18 }}
          >
            ›
          </button>
        )}
      </div>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, color: "#fff" }}>
          {resolvePlaceName(photo, dynamicPlacesById)}
        </p>
        <p style={{ fontFamily: "Nunito", fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 4 }}>
          {index + 1} / {photos.length}
        </p>
        {photo.note && (
          <p style={{ fontFamily: "Caveat", fontSize: 16, fontStyle: "italic", color: "#fff", marginTop: 8 }}>
            &quot;{photo.note}&quot;
          </p>
        )}
      </div>
    </div>
  );
}

function groupByDay(photos: DiaryPhoto[]): [string, DiaryPhoto[]][] {
  const map = new Map<string, DiaryPhoto[]>();
  for (const photo of photos) {
    const day = new Date(photo.completedAt).toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    });
    const list = map.get(day) ?? [];
    list.push(photo);
    map.set(day, list);
  }
  return Array.from(map.entries());
}
