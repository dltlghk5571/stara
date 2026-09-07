import type { Dict } from "./en";

export const ko: Dict = {
  common: {
    loading: "불러오는 중…",
    retry: "다시 시도",
    back: "뒤로",
    cancel: "취소",
    noInfo: "정보 없음",
    minutes: "{n}분",
    soon: "준비중",
  },
  onboarding: {
    artists: {
      kicker: "최애 아티스트 선택",
      title: "여행 메이트를 골라주세요!",
      subtitle:
        "좋아하는 아티스트를 골라주세요(여러 명 선택 가능) — 취향에 맞춰 루트를 만들어드려요.",
    },
    region: {
      kicker: "지역 선택",
      title: "어디로 떠나볼까요? 🗺️",
      subtitle: "지역을 선택하면 대표 아티스트와 콘텐츠를 볼 수 있어요.",
      comingSoon: "{region} · 준비 중",
    },
    regionDetail: {
      nowCurating: "준비 중",
      previewLoading: "불러오는 중…",
      previewCta: "TourAPI 인기 스팟으로 미리보기",
      generateHint: "선택한 지역을 기준으로 루트를 만들어드려요.",
      selectRegion: "{region} 선택할까요?",
      repArtistLabel: "대표 아티스트",
      curatingLabel: "큐레이션 중",
      selectCta: "이 지역 선택 ✦",
    },
    generate: {
      needRegionTitle: "지역을 먼저 선택해주세요",
      needRegionCta: "지역 선택으로 이동",
      building: "{region} 루트를 만드는 중…",
      noneTitle: "지금은 {region} 루트 후보를 찾지 못했어요",
      noneBody: "잠시 후 다시 시도해주세요.",
      ready: "{region} 루트 {count}가지를 준비했어요. 하나를 골라주세요.",
      confirmRoute: "이 루트로 확정",
    },
  },
};
