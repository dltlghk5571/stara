"use client";

import { useUser } from "@clerk/nextjs";
import { capabilitiesFromPublicMetadata, type VerificationCapabilities } from "./verificationCapabilities";

/** 클라이언트 컴포넌트 전용 — 인증된 Clerk 유저 세션의 publicMetadata에서 읽는다.
 *  로그아웃/로딩 중에는 안전하게 일반 유저 capability로 취급한다. */
export function useVerificationCapabilities(): VerificationCapabilities {
  const { user } = useUser();
  return capabilitiesFromPublicMetadata(user?.publicMetadata);
}
