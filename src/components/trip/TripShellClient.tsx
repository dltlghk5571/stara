"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Map as MapIcon, Sparkles, Stamp as StampIcon } from "lucide-react";
import { useTripStore } from "@/store/tripStore";
import { useTripPlan } from "@/store/useTripPlan";
import { getPlaceById } from "@/data/places";
import MapView from "@/components/map/MapView";
import StampGrid from "@/components/stamp/StampGrid";
import MissionSheet from "@/components/trip/MissionSheet";
import SubQuestList from "@/components/quest/SubQuestList";
import type { Place, Quest } from "@/types";

export interface DiaryPhoto {
  id: string;
  placeId: string;
  photoUrl: string;
  note: string | null;
  completedAt: string;
  tripId: string | null;
  tripName: string | null;
}

export interface TripGroup {
  key: string;
  name: string;
  photos: DiaryPhoto[];
}

type Tab = "cover" | "stamps" | "route" | "diary";

interface Props {
  initialDiaryGroups: TripGroup[];
  initialTab?: Tab;
}

export default function TripShellClient({ initialDiaryGroups, initialTab }: Props) {
  const router = useRouter();
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
  const startTrip = useTripStore((s) => s.startTrip);
  const completeTrip = useTripStore((s) => s.completeTrip);

  const { orderedPlaces, schedule } = useTripPlan();

  // /travel, /complete와 동일한 하이드레이션 가드 패턴: zustand persist가 localStorage에서
  // 복원되기 전 첫 렌더는 항상 초기값을 반환하므로(useSyncExternalStore가 SSR 스냅샷을
  // 우선함), 반응형 값이 아니라 getState()로 실제 복원된 값을 effect 안에서 다시 확인한
  // 뒤에만 리다이렉트/자동시작한다. 화면 표시용 값(startedAt/mainRoutePlaces)은 하이드레이션이
  // 끝나는 다음 렌더에서 스스로 올바른 값으로 갱신된다.
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

  return (
    <div className="font-jakarta text-stara-navy flex min-h-screen flex-col bg-stara-bg">
      <div className="flex items-center justify-between px-5 pb-3 pt-11">
        <span className="font-fraunces text-[15px] font-semibold">
          STAR<span className="text-stara-coral">A</span>
        </span>
        {activeTripName && (
          <span className="font-space-mono rounded-full bg-stara-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
            {activeTripName}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {tab === "cover" && (
          <CoverTab
            tripName={activeTripName}
            earned={earnedStampIds.length}
            total={orderedPlaces.length}
            onCreateNew={() => router.push("/onboarding/artists")}
            onEditRoute={() => router.push("/edit")}
            onViewRoute={() => setTab("route")}
          />
        )}

        {tab === "stamps" && (
          <div className="px-5 pt-2">
            <h1 className="font-fraunces text-xl font-bold">Mission Stamps</h1>
            <p className="mb-4 mt-1 text-xs text-stone-500">
              미션을 완료할 때마다 스탬프가 쌓여요.
            </p>
            <StampGrid orderedPlaces={orderedPlaces} earnedStampIds={earnedStampIds} />
          </div>
        )}

        {tab === "route" && (
          <RouteTab
            orderedPlaces={orderedPlaces}
            statusOf={statusOf}
            allDone={allDone}
            currentIndex={currentIndex}
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

        {tab === "diary" && <DiaryTab groups={diaryGroups} />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-stone-200 bg-white/95 px-1.5 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur">
        <TabButton icon={<BookOpen size={18} />} label="Cover" active={tab === "cover"} onClick={() => setTab("cover")} />
        <TabButton icon={<Sparkles size={18} />} label="Diary" active={tab === "diary"} onClick={() => setTab("diary")} />
        <TabButton icon={<MapIcon size={18} />} label="Route" active={tab === "route"} onClick={() => setTab("route")} />
        <TabButton icon={<StampIcon size={18} />} label="Stamps" active={tab === "stamps"} onClick={() => setTab("stamps")} />
      </nav>

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

function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-semibold ${
        active ? "text-stara-coral" : "text-stone-400"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CoverTab({
  tripName,
  earned,
  total,
  onCreateNew,
  onEditRoute,
  onViewRoute,
}: {
  tripName: string | null;
  earned: number;
  total: number;
  onCreateNew: () => void;
  onEditRoute: () => void;
  onViewRoute: () => void;
}) {
  return (
    <div className="px-5 pt-2">
      <div className="relative flex flex-col items-center justify-between overflow-hidden rounded-[22px] bg-gradient-to-br from-stara-coral via-[#ff7a63] to-stara-navy px-6 py-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]">
        <p className="font-space-mono text-[10px] uppercase tracking-[0.24em] text-orange-100">
          Your Travel Passport
        </p>
        <div className="my-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-white/55 text-3xl">
          🎬
        </div>
        <p className="font-fraunces text-center text-xl font-bold leading-tight text-white">
          K-Content Travel
          <br />
          Passport
        </p>
        <p className="font-fraunces mt-1.5 text-xs italic text-orange-100">
          &ldquo;Play the scene. Keep the story.&rdquo;
        </p>
        <div className="mt-5 flex w-full items-end justify-between border-t border-dashed border-white/40 pt-3">
          <div>
            <p className="font-space-mono text-[8px] tracking-wide text-orange-50">ROUTE</p>
            <p className="font-caveat text-lg font-bold text-white">{tripName ?? "STARA Trip"}</p>
          </div>
          <div className="text-right">
            <b className="font-fraunces block text-[17px] text-white">
              {earned} / {total}
            </b>
            <p className="font-space-mono text-[8px] tracking-wide text-orange-50">STAMPS</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onCreateNew}
          className="flex min-h-11 items-center justify-center rounded-2xl bg-stara-coral text-sm font-bold text-white shadow-lg shadow-orange-200 dark:shadow-none"
        >
          + Create New Route
        </button>
        <button
          type="button"
          onClick={onViewRoute}
          className="flex min-h-11 items-center justify-center rounded-2xl border-2 border-stara-navy text-[13.5px] font-bold"
        >
          🗺️ View Current Quests
        </button>
        <button
          type="button"
          onClick={onEditRoute}
          className="text-center text-xs font-semibold text-stone-400 underline"
        >
          루트 직접 편집하기
        </button>
      </div>
    </div>
  );
}

function RouteTab({
  orderedPlaces,
  statusOf,
  allDone,
  currentIndex,
  segmentQuest,
  completedQuestIds,
  onToggleSubQuest,
  onOpenMission,
  onFinish,
}: {
  orderedPlaces: Place[];
  statusOf: (i: number) => "done" | "next" | "locked";
  allDone: boolean;
  currentIndex: number;
  segmentQuest?: Quest;
  completedQuestIds: string[];
  onToggleSubQuest: (questId: string) => void;
  onOpenMission: (i: number) => void;
  onFinish: () => void;
}) {
  return (
    <div className="px-5 pt-2">
      <h1 className="font-fraunces text-xl font-bold">Quests &amp; Map</h1>
      <p className="mb-3 mt-1 text-xs text-stone-500">
        다음 체크포인트를 탭해서 미션을 진행하세요.
      </p>

      <div className="h-56 overflow-hidden rounded-2xl border border-stone-200">
        <MapView
          pins={orderedPlaces.map((p, i) => ({
            id: p.id,
            lat: p.latitude,
            lng: p.longitude,
            order: i + 1,
            color: "#243b53",
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
        <div className="mt-3">
          <SubQuestList
            quest={segmentQuest}
            completedQuestIds={completedQuestIds}
            onToggle={onToggleSubQuest}
          />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {orderedPlaces.map((p, i) => {
          const status = statusOf(i);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpenMission(i)}
              disabled={status !== "next"}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${
                status === "next"
                  ? "border-stara-coral bg-white shadow-[0_6px_14px_-10px_rgba(255,143,122,0.6)]"
                  : status === "done"
                    ? "border-stone-200 bg-white"
                    : "border-dashed border-stone-300 bg-transparent opacity-60"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  status === "done"
                    ? "bg-stara-mint text-stara-navy"
                    : status === "next"
                      ? "bg-stara-coral text-white"
                      : "border-2 border-dashed border-stone-300 text-stone-400"
                }`}
              >
                {i + 1}
              </span>
              <span>
                <span className="block text-[13px] font-bold">{p.nameKo}</span>
                <span className="font-space-mono block text-[9px] text-stone-500">
                  {status === "done" ? "✓ Completed" : status === "next" ? "Up next · tap to view" : "🔒 Locked"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {allDone && orderedPlaces.length > 0 && (
        <button
          type="button"
          onClick={onFinish}
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-2xl bg-stara-coral text-sm font-bold text-white"
        >
          모든 체크포인트 완료 — 여행 마무리하기
        </button>
      )}
      {currentIndex === -1 && orderedPlaces.length === 0 && (
        <p className="mt-4 text-center text-xs text-stone-400">아직 루트가 없어요.</p>
      )}
    </div>
  );
}

function DiaryTab({ groups }: { groups: TripGroup[] }) {
  const [activeKey, setActiveKey] = useState(groups[0]?.key ?? null);
  const active = groups.find((g) => g.key === activeKey) ?? groups[0];
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (groups.length === 0) {
    return (
      <div className="px-5 pt-2 text-center">
        <h1 className="font-fraunces text-xl font-bold">Diary</h1>
        <p className="mt-6 text-sm text-stone-400">
          첫 미션을 완료하면 다이어리가 채워져요.
        </p>
      </div>
    );
  }

  const days = groupByDay(active.photos);

  return (
    <div className="pt-2">
      <div className="flex gap-2 overflow-x-auto px-5 pb-3">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setActiveKey(g.key)}
            className={`font-space-mono shrink-0 whitespace-nowrap rounded-full border-2 border-stara-navy px-3 py-1.5 text-[10px] ${
              g.key === active.key ? "bg-stara-navy text-stara-bg" : "opacity-50"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="px-5">
        {days.map(([day, photos]) => (
          <div key={day}>
            <p className="font-caveat mb-3 text-xl font-bold text-stara-coral">{day}</p>
            <div className="mb-6 flex flex-col gap-6">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setViewerIndex(active.photos.findIndex((p) => p.id === photo.id))}
                  className={`relative mx-auto w-[82%] rounded-sm bg-white p-2.5 pb-8 text-left shadow-[0_10px_22px_-12px_rgba(36,59,83,0.4)] ${
                    i % 2 === 0 ? "-rotate-2" : "rotate-1"
                  }`}
                >
                  <span className="absolute -top-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-stara-coral shadow" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.photoUrl} alt="" className="block w-full rounded-sm" />
                  {photo.note && (
                    <p className="font-caveat mt-2 text-center text-base text-stara-navy">
                      {photo.note}
                    </p>
                  )}
                  <p className="font-space-mono absolute bottom-2 left-0 right-0 text-center text-[8px] text-stone-500">
                    {getPlaceById(photo.placeId)?.nameKo ?? photo.placeId}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {viewerIndex !== null && (
        <DiaryViewer
          photos={active.photos}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
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
}: {
  photos: DiaryPhoto[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-6"
      onClick={onClose}
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
      <span className="font-space-mono text-[10px] text-white/60">
        {index + 1} / {photos.length}
      </span>

      <div className="relative flex w-full max-w-md items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {index > 0 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="이전 사진"
            className="absolute left-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg text-white"
          >
            ‹
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.photoUrl} alt="" className="w-full rounded-xl" />
        {index < photos.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="다음 사진"
            className="absolute right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg text-white"
          >
            ›
          </button>
        )}
      </div>

      <div className="text-center">
        {photo.note && (
          <p className="font-caveat text-lg text-white">&ldquo;{photo.note}&rdquo;</p>
        )}
        <p className="font-space-mono mt-1 text-[9px] text-white/50">
          {getPlaceById(photo.placeId)?.nameKo ?? photo.placeId}
        </p>
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
