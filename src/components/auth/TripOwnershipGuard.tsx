"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useTripStore } from "@/store/tripStore";

/**
 * 전역 마운트 컴포넌트 — 인증된 Clerk userId가 바뀔 때마다 tripStore.bindUser를 호출한다.
 * 트립스토어는 브라우저-로컬 persist라 Clerk 계정과 무관하게 남아있을 수 있어서, 같은
 * 브라우저에서 다른 계정(특히 테스터 계정)으로 로그인해도 이전 계정의 완료된 퀘스트/스탬프가
 * 새어 보이지 않도록 여기서 막는다. 로그아웃 자체로는 아무것도 지우지 않는다 — 같은 유저가
 * 다시 로그인하면 로컬 여행이 그대로 남아 있어야 한다(14절). 화면에는 아무것도 렌더링하지
 * 않는다.
 */
export default function TripOwnershipGuard() {
  const { user, isLoaded } = useUser();
  const bindUser = useTripStore((s) => s.bindUser);

  useEffect(() => {
    if (!isLoaded || !user) return;
    bindUser(user.id);
  }, [isLoaded, user, bindUser]);

  return null;
}
