import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadReviewDecisions, saveReviewDecisions, setReviewDecision, clearReviewDecision } from "./reviewStore";

let tmpDir: string | null = null;
function tmpPath(): string {
  tmpDir = mkdtempSync(join(tmpdir(), "stara-review-"));
  return join(tmpDir, "review-decisions.json");
}

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = null;
});

describe("reviewStore", () => {
  it("파일이 없으면 빈 객체를 돌려준다(모든 place가 draft로 취급됨)", () => {
    const path = join(tmpdir(), "definitely-does-not-exist-review.json");
    expect(loadReviewDecisions(path)).toEqual({});
  });

  it("결정을 저장하면 다시 읽을 수 있다", () => {
    const path = tmpPath();
    setReviewDecision("place-1", { status: "verified", reviewedAt: "2026-09-17T00:00:00Z" }, path);
    const loaded = loadReviewDecisions(path);
    expect(loaded["place-1"].status).toBe("verified");
  });

  it("여러 결정을 누적 저장해도 기존 항목을 지우지 않는다", () => {
    const path = tmpPath();
    setReviewDecision("place-1", { status: "verified", reviewedAt: "t1" }, path);
    setReviewDecision("place-2", { status: "published", reviewedAt: "t2" }, path);
    const loaded = loadReviewDecisions(path);
    expect(Object.keys(loaded).sort()).toEqual(["place-1", "place-2"]);
  });

  it("같은 place를 다시 저장하면 갱신된다(덮어씀)", () => {
    const path = tmpPath();
    setReviewDecision("place-1", { status: "verified", reviewedAt: "t1" }, path);
    setReviewDecision("place-1", { status: "published", reviewedAt: "t2" }, path);
    expect(loadReviewDecisions(path)["place-1"].status).toBe("published");
  });

  it("clearReviewDecision은 결정을 지워 draft로 되돌린다", () => {
    const path = tmpPath();
    setReviewDecision("place-1", { status: "verified", reviewedAt: "t1" }, path);
    clearReviewDecision("place-1", path);
    expect(loadReviewDecisions(path)["place-1"]).toBeUndefined();
  });

  it("saveReviewDecisions로 통째로 써도 정상 동작한다", () => {
    const path = tmpPath();
    saveReviewDecisions({ "place-1": { status: "verified", reviewedAt: "t1" } }, path);
    expect(loadReviewDecisions(path)["place-1"].status).toBe("verified");
  });
});
