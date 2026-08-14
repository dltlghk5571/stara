"use client";

import { Component, type ReactNode } from "react";
import { MapPinOff } from "lucide-react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/** 지도 렌더링(TMap) 실패 시 전체 화면이 깨지지 않도록 감싸는 경계 */
export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <MapPinOff size={28} />
          <p className="text-sm">지도를 불러오지 못했습니다.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
