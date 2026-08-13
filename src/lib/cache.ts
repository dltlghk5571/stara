// 아주 단순한 인메모리 TTL 캐시. 외부 API(TourAPI/TMAP) 호출 과다를 막는 공용 모듈.
// 나중에 Redis/Vercel KV로 바꿀 때는 get/set 시그니처만 유지한 채 내부만 교체하면 된다.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10분

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
