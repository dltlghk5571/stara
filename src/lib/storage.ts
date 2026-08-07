// localStorage 접근 래퍼. SSR에서는 window가 없고, 저장된 값이 손상되어 있을 수 있으므로
// 두 경우 모두 조용히 무시하고 기본값을 쓰도록 방어한다.

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패(용량 초과 등)는 조용히 무시 - 진행에는 영향 없음
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

/** zustand persist 등 "직렬화된 문자열"을 직접 다루는 라이브러리를 위한 저수준 스토리지 어댑터 */
export const safeStringStorage = {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // no-op
    }
  },
  removeItem(key: string): void {
    removeKey(key);
  },
};
