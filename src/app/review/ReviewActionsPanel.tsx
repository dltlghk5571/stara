"use client";

import { useActionState } from "react";
import { markVerified, markPublished, flagNeedsReReview, revertToDraft, type ActionResult } from "./actions";

function wrapAction(fn: (placeId: string, note: string) => Promise<ActionResult>, placeId: string) {
  return async (_prev: ActionResult | null, formData: FormData): Promise<ActionResult> => {
    const note = String(formData.get("note") ?? "");
    return fn(placeId, note);
  };
}

interface Props {
  placeId: string;
  status: "draft" | "verified" | "published";
  verifyErrors: string[];
  publishErrors: string[];
  hasDecision: boolean;
}

/** 리뷰어의 명시적 클릭만 상태를 바꾼다 — 어떤 자동 승격도 없다. 에러가 있으면 버튼 자체를 막는다. */
export default function ReviewActionsPanel({ placeId, status, verifyErrors, publishErrors, hasDecision }: Props) {
  const [verifyState, verifyAction, verifyPending] = useActionState(wrapAction(markVerified, placeId), null);
  const [publishState, publishAction, publishPending] = useActionState(wrapAction(markPublished, placeId), null);
  const [flagState, flagAction, flagPending] = useActionState(wrapAction(flagNeedsReReview, placeId), null);
  const [revertState, revertAction, revertPending] = useActionState(
    async (): Promise<ActionResult> => revertToDraft(placeId),
    null
  );

  const btnStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 6,
    border: "1px solid #ccc",
    cursor: "pointer",
    fontSize: 13,
  };
  const errStyle: React.CSSProperties = { color: "#c0392b", fontSize: 12, marginTop: 4 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>현재 상태: {status}</div>

      <form action={verifyAction} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <textarea name="note" placeholder="검수 메모(선택)" rows={2} style={{ flex: 1, fontSize: 12 }} />
        <button
          type="submit"
          disabled={status !== "draft" || verifyErrors.length > 0 || verifyPending}
          style={{ ...btnStyle, background: "#2ecc71", color: "#fff", opacity: status !== "draft" || verifyErrors.length > 0 ? 0.5 : 1 }}
          title={verifyErrors.length > 0 ? verifyErrors.join(" / ") : undefined}
        >
          Mark verified
        </button>
      </form>
      {verifyState?.error && <p style={errStyle}>{verifyState.error}</p>}

      <form action={publishAction} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <textarea name="note" placeholder="발행 메모(선택)" rows={2} style={{ flex: 1, fontSize: 12 }} />
        <button
          type="submit"
          disabled={status !== "verified" || publishErrors.length > 0 || publishPending}
          style={{ ...btnStyle, background: "#3498db", color: "#fff", opacity: status !== "verified" || publishErrors.length > 0 ? 0.5 : 1 }}
          title={publishErrors.length > 0 ? publishErrors.join(" / ") : undefined}
        >
          Mark published
        </button>
      </form>
      {publishState?.error && <p style={errStyle}>{publishState.error}</p>}

      <form action={flagAction} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <textarea name="note" placeholder="재검토가 필요한 이유" rows={2} style={{ flex: 1, fontSize: 12 }} />
        <button type="submit" disabled={!hasDecision || flagPending} style={{ ...btnStyle, opacity: hasDecision ? 1 : 0.5 }}>
          Flag needs re-review
        </button>
      </form>
      {flagState?.error && <p style={errStyle}>{flagState.error}</p>}

      <form action={revertAction}>
        <button type="submit" disabled={!hasDecision || revertPending} style={{ ...btnStyle, opacity: hasDecision ? 1 : 0.5 }}>
          Revert to draft
        </button>
      </form>
      {revertState?.error && <p style={errStyle}>{revertState.error}</p>}
    </div>
  );
}
