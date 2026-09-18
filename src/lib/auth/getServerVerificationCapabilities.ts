import { currentUser } from "@clerk/nextjs/server";
import { capabilitiesFromPublicMetadata, type VerificationCapabilities } from "./verificationCapabilities";

/**
 * 서버 라우트 전용 — 요청 바디의 어떤 값도 신뢰하지 않고, 인증된 Clerk 세션에서 직접
 * publicMetadata를 조회해 capability를 판정한다(4/9절: 클라이언트가 보낸 testBypass 같은
 * 플래그는 이 판정 없이는 절대 통과시키지 않는다).
 *
 * Clerk 세션 토큰 claims를 커스터마이즈하지 않은 기본 설정에서도 동작하도록
 * currentUser()(Backend API 조회, Clerk가 캐시)를 쓴다 — 별도 Dashboard 설정이 필요 없는
 * 가장 작은 방법. 세션 토큰에 publicMetadata를 이미 커스텀 claim으로 넣어뒀다면 그 claim을
 * 읽도록 바꿔도 된다(README 참고).
 */
export async function getServerVerificationCapabilities(): Promise<VerificationCapabilities> {
  const user = await currentUser();
  return capabilitiesFromPublicMetadata(user?.publicMetadata ?? null);
}
