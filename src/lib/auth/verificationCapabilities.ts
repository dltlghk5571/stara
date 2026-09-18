// 테스터 계정 판별 및 파생 capability — Clerk publicMetadata.role === "tester"가 유일한
// 권위 소스다. `user.publicMetadata.role === "tester"`를 여러 컴포넌트/라우트에 흩뿌리지
// 않고 이 파일 하나로 모은다. 순수 함수라 Clerk 없이도 단위 테스트할 수 있다 — 클라이언트
// (useVerificationCapabilities)와 서버(getServerVerificationCapabilities) 양쪽에서 이
// 함수 하나만 재사용한다.
//
// 오늘은 GPS 미션/T-money 인증 우회만 있지만, 나중에 테스트 전용 검증 모드가 늘어나도
// 이 인터페이스에 필드만 추가하면 된다.
export interface VerificationCapabilities {
  isTester: boolean;
  bypassGpsMission: boolean;
  bypassTmoneyVerification: boolean;
}

const NORMAL_CAPABILITIES: VerificationCapabilities = {
  isTester: false,
  bypassGpsMission: false,
  bypassTmoneyVerification: false,
};

const TESTER_CAPABILITIES: VerificationCapabilities = {
  isTester: true,
  bypassGpsMission: true,
  bypassTmoneyVerification: true,
};

/**
 * publicMetadata가 없거나(로그아웃, 로딩 중) role이 정확히 "tester"가 아니면 항상 일반
 * 유저로 취급한다(안전 기본값 — 모호하면 우회 없음). 클라이언트가 보낸 임의의 값이 아니라
 * 항상 Clerk에서 읽은 metadata만 여기 들어와야 한다(호출부 책임).
 */
export function capabilitiesFromPublicMetadata(
  metadata: Record<string, unknown> | null | undefined
): VerificationCapabilities {
  if (!metadata) return NORMAL_CAPABILITIES;
  return metadata.role === "tester" ? TESTER_CAPABILITIES : NORMAL_CAPABILITIES;
}
