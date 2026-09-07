"use client";

import { Component, type ReactNode } from "react";
import { MapPinOff } from "lucide-react";
import { useT } from "@/i18n";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/** 클래스형 경계는 훅을 못 쓰므로, 폴백 마크업만 함수형으로 분리해 useT()를 쓴다. */
function MapErrorFallback() {
  const t = useT();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-900">
      <MapPinOff size={28} />
      <p className="text-sm">{t("map.loadFailedShort")}</p>
    </div>
  );
}

/** 지도 렌더링(TMap) 실패 시 전체 화면이 깨지지 않도록 감싸는 경계 */
export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <MapErrorFallback />;
    }
    return this.props.children;
  }
}
