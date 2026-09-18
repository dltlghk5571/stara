import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCitationResearch, saveCitationResearch, setCitationResearch } from "./citationStore";

let tmpDir: string | null = null;
function tmpPath(): string {
  tmpDir = mkdtempSync(join(tmpdir(), "stara-citation-"));
  return join(tmpDir, "citation-research.json");
}

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = null;
});

describe("citationStore", () => {
  it("파일이 없으면 빈 객체를 돌려준다", () => {
    const path = join(tmpdir(), "definitely-does-not-exist-citation.json");
    expect(loadCitationResearch(path)).toEqual({});
  });

  it("저장한 리서치 결과를 다시 읽을 수 있다", () => {
    const path = tmpPath();
    setCitationResearch(
      "place-1",
      { placeId: "place-1", citationStatus: "direct", reviewed: false },
      path
    );
    expect(loadCitationResearch(path)["place-1"].citationStatus).toBe("direct");
  });

  it("여러 항목을 누적 저장해도 서로 덮어쓰지 않는다", () => {
    const path = tmpPath();
    setCitationResearch("place-1", { placeId: "place-1", citationStatus: "direct", reviewed: false }, path);
    setCitationResearch("place-2", { placeId: "place-2", citationStatus: "weak", reviewed: false }, path);
    const loaded = loadCitationResearch(path);
    expect(Object.keys(loaded).sort()).toEqual(["place-1", "place-2"]);
  });

  it("saveCitationResearch로 통째로 써도 정상 동작한다", () => {
    const path = tmpPath();
    saveCitationResearch(
      { "place-1": { placeId: "place-1", citationStatus: "broken", reviewed: false } },
      path
    );
    expect(loadCitationResearch(path)["place-1"].citationStatus).toBe("broken");
  });
});
