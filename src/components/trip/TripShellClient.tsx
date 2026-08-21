"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
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

type Tab = "cover" | "diary" | "route" | "stamps";

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
  const startTrip = useTripStore((s) => s.startTrip);
  const completeTrip = useTripStore((s) => s.completeTrip);

  const { orderedPlaces, schedule } = useTripPlan();

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
    <div id="tv-app" className="tl-view">
      <div className="appbar">
        <div className="brand">
          STAR<span>A</span>
        </div>
        {activeTripName && <div className="route-chip">{activeTripName.toUpperCase()}</div>}
      </div>

      <div className="pages">
        {tab === "cover" && (
          <div className="page" id="page-cover">
            <div className="cover-wrap">
              <div className="cover">
                <div className="kicker">Your Travel Passport</div>
                <div className="emblem">
                  <span className="glyph">🎬</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div className="cover-title">
                    K-Content Travel
                    <br />
                    Passport
                  </div>
                  <div className="cover-sub">&ldquo;Play the scene. Keep the story.&rdquo;</div>
                </div>
                <div className="cover-footer">
                  <div>
                    <div className="label">HOLDER</div>
                    <div className="holder">{holderName}</div>
                  </div>
                  <div className="stat">
                    <b>
                      {earnedStampIds.length} / {orderedPlaces.length}
                    </b>
                    <div className="label">STAMPS</div>
                  </div>
                </div>
              </div>
              <div className="home-ctas">
                <button className="btn btn-primary" onClick={() => router.push("/onboarding/artists")}>
                  + Create New Route
                </button>
                <button className="btn btn-secondary" onClick={() => setTab("route")}>
                  🗺️ View Current Quests
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => router.push("/edit")}
                  style={{ marginTop: "-2px" }}
                >
                  루트 직접 편집하기
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "stamps" && (
          <div className="page" id="page-stamps">
            <div className="stamp-page">
              <div className="section-title">Mission Stamps</div>
              <div className="section-sub">미션을 완료할 때마다 스탬프가 쌓여요.</div>
              <StampGrid orderedPlaces={orderedPlaces} earnedStampIds={earnedStampIds} />
              <div className="progress-bar">
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${orderedPlaces.length ? (earnedStampIds.length / orderedPlaces.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="progress-num">
                  {orderedPlaces.length
                    ? Math.round((earnedStampIds.length / orderedPlaces.length) * 100)
                    : 0}
                  %
                </div>
              </div>
            </div>
          </div>
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

        {tab === "diary" && <DiaryTab groups={diaryGroups} />}
      </div>

      <div className="navbar">
        <NavBtn icon="📘" label="Cover" active={tab === "cover"} onClick={() => setTab("cover")} />
        <NavBtn icon="🗒️" label="Diary" active={tab === "diary"} onClick={() => setTab("diary")} />
        <NavBtn icon="🗺️" label="Route" active={tab === "route"} onClick={() => setTab("route")} />
        <NavBtn icon="🏅" label="Stamps" active={tab === "stamps"} onClick={() => setTab("stamps")} />
      </div>

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

function NavBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`navbtn${active ? " active" : ""}`} onClick={onClick}>
      <div className="ic">{icon}</div>
      {label}
    </button>
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
  return (
    <div className="page" id="page-route">
      <div className="route-header">
        <div>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "15px" }}>
            Quests &amp; Map
          </div>
          <div className="route-title">다음 체크포인트를 탭해서 미션을 진행하세요</div>
        </div>
        <div className="route-counter">
          🏅 {orderedPlaces.filter((_, i) => statusOf(i) === "done").length}/{orderedPlaces.length}
        </div>
      </div>

      <div className="map" style={{ overflow: "hidden" }}>
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
        <div style={{ padding: "0 20px", marginTop: "10px" }}>
          <SubQuestList quest={segmentQuest} completedQuestIds={completedQuestIds} onToggle={onToggleSubQuest} />
        </div>
      )}

      <div className="quest-list">
        <div className="quest-list-title">Quest List</div>
        {orderedPlaces.map((p, i) => {
          const status = statusOf(i);
          return (
            <div
              key={p.id}
              className={`quest ${status}`}
              onClick={() => onOpenMission(i)}
              style={status !== "next" ? { cursor: "default" } : undefined}
            >
              <div className="quest-ic">{status === "locked" ? "🔒" : status === "done" ? "✓" : "⏳"}</div>
              <div>
                <div className="quest-name">{p.nameKo}</div>
                <div className="quest-status">
                  {status === "done" ? "✓ Completed" : status === "next" ? "Up next · tap to view" : "🔒 Locked"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {allDone && orderedPlaces.length > 0 && (
        <div style={{ padding: "16px 20px 0" }}>
          <button className="btn btn-coral" onClick={onFinish}>
            모든 체크포인트 완료 — 여행 마무리하기
          </button>
        </div>
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
      <div className="page" id="page-diary">
        <div className="stamp-page" style={{ textAlign: "center" }}>
          <div className="section-title">Diary</div>
          <div className="section-sub" style={{ marginTop: "12px" }}>
            첫 미션을 완료하면 다이어리가 채워져요.
          </div>
        </div>
      </div>
    );
  }

  const days = groupByDay(active.photos);

  return (
    <div className="page" id="page-diary">
      <div className="diary-routes">
        {groups.map((g) => (
          <div
            key={g.key}
            className={`diary-route-tab${g.key === active.key ? " active" : ""}`}
            onClick={() => setActiveKey(g.key)}
          >
            {g.name}
          </div>
        ))}
      </div>

      <div className="diary-board">
        {days.map(([day, photos]) => (
          <div key={day}>
            <div className="diary-day">{day}</div>
            {photos.map((photo, i) => (
              <div
                key={photo.id}
                className={`pin-card ${i % 2 === 0 ? "rot-l" : "rot-r"}`}
                onClick={() => setViewerIndex(active.photos.findIndex((p) => p.id === photo.id))}
              >
                <div className="pushpin"></div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.photoUrl} alt="" />
                {photo.note && <div className="pin-cap">{photo.note}</div>}
                <div className="pin-meta">
                  <span>{getPlaceById(photo.placeId)?.nameKo ?? photo.placeId}</span>
                </div>
              </div>
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
      className="lightbox open"
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
      <button className="lightbox-close" onClick={onClose}>
        ✕
      </button>

      <div style={{ position: "relative", width: "100%", maxWidth: "420px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {index > 0 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="이전 사진"
            style={{
              position: "absolute", left: "8px", zIndex: 10, width: "36px", height: "36px",
              borderRadius: "50%", background: "rgba(0,0,0,.4)", color: "#fff", border: "none", fontSize: "18px",
            }}
          >
            ‹
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.photoUrl} alt="" />
        {index < photos.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="다음 사진"
            style={{
              position: "absolute", right: "8px", zIndex: 10, width: "36px", height: "36px",
              borderRadius: "50%", background: "rgba(0,0,0,.4)", color: "#fff", border: "none", fontSize: "18px",
            }}
          >
            ›
          </button>
        )}
      </div>

      <div className="lightbox-meta">
        <div className="lightbox-loc">{getPlaceById(photo.placeId)?.nameKo ?? photo.placeId}</div>
        <div className="lightbox-time">
          {index + 1} / {photos.length}
        </div>
        {photo.note && <div className="lightbox-cap">&ldquo;{photo.note}&rdquo;</div>}
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
