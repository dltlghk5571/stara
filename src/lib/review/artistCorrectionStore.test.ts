import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadArtistCorrections,
  proposeArtistCorrection,
  applyApprovedArtistCorrections,
  reclassifyArtistCorrection,
  type ArtistCorrections,
} from "./artistCorrectionStore";

let tmpDir: string | null = null;
afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = null;
});
function tmpDirPath(): string {
  tmpDir = mkdtempSync(join(tmpdir(), "stara-artist-correction-"));
  return tmpDir;
}

function writePlaces(dir: string, places: Array<{ place_id: string; artist_ids: string[]; other?: string }>): string {
  const path = join(dir, "places.json");
  writeFileSync(path, JSON.stringify(places, null, 2));
  return path;
}

describe("proposeArtistCorrection", () => {
  it("제안을 저장하면 status는 항상 proposed로 시작한다", () => {
    const dir = tmpDirPath();
    const path = join(dir, "artist-corrections.json");
    proposeArtistCorrection(
      { placeId: "p1", artistId: "seventeen", action: "remove_artist_relation", reason: "no evidence found" },
      path
    );
    const loaded = loadArtistCorrections(path);
    expect(loaded["p1"][0].status).toBe("proposed");
  });

  it("한 place에 여러 제안을 누적할 수 있다", () => {
    const dir = tmpDirPath();
    const path = join(dir, "artist-corrections.json");
    proposeArtistCorrection({ placeId: "p1", artistId: "a", action: "remove_artist_relation", reason: "r1" }, path);
    proposeArtistCorrection({ placeId: "p1", artistId: "b", action: "remove_artist_relation", reason: "r2" }, path);
    expect(loadArtistCorrections(path)["p1"]).toHaveLength(2);
  });
});

describe("applyApprovedArtistCorrections — artistIds are never auto-removed", () => {
  it("status가 proposed인 제안은 적용하지 않는다(artistIds 그대로)", () => {
    const dir = tmpDirPath();
    const placesPath = writePlaces(dir, [{ place_id: "p1", artist_ids: ["a", "b"] }]);
    const correctionsPath = join(dir, "artist-corrections.json");
    proposeArtistCorrection({ placeId: "p1", artistId: "b", action: "remove_artist_relation", reason: "unsupported" }, correctionsPath);

    const result = applyApprovedArtistCorrections(placesPath, correctionsPath);
    expect(result.appliedCount).toBe(0);

    const places = JSON.parse(readFileSync(placesPath, "utf-8"));
    expect(places[0].artist_ids).toEqual(["a", "b"]); // 안 바뀜
  });

  it("status가 approved인 제안만 실제로 artist_ids에서 제거한다", () => {
    const dir = tmpDirPath();
    const placesPath = writePlaces(dir, [{ place_id: "p1", artist_ids: ["a", "b", "c"] }]);
    const correctionsPath = join(dir, "artist-corrections.json");
    const corrections: ArtistCorrections = {
      p1: [
        { placeId: "p1", artistId: "b", action: "remove_artist_relation", status: "approved", reason: "unsupported", proposedAt: "t0" },
        { placeId: "p1", artistId: "c", action: "remove_artist_relation", status: "proposed", reason: "still uncertain", proposedAt: "t0" },
      ],
    };
    writeFileSync(correctionsPath, JSON.stringify(corrections));

    const result = applyApprovedArtistCorrections(placesPath, correctionsPath);
    expect(result.appliedCount).toBe(1);
    expect(result.appliedPlaceIds).toEqual(["p1"]);

    const places = JSON.parse(readFileSync(placesPath, "utf-8"));
    expect(places[0].artist_ids).toEqual(["a", "c"]); // b만 제거, c(proposed)는 남음

    const afterCorrections = loadArtistCorrections(correctionsPath);
    expect(afterCorrections["p1"].find((c) => c.artistId === "b")!.status).toBe("applied");
    expect(afterCorrections["p1"].find((c) => c.artistId === "c")!.status).toBe("proposed"); // 안 바뀜
  });

  it("적용해도 다른 place 필드는 전혀 건드리지 않는다(구조 보존)", () => {
    const dir = tmpDirPath();
    const placesPath = writePlaces(dir, [{ place_id: "p1", artist_ids: ["a", "b"], other: "untouched-value" }]);
    const correctionsPath = join(dir, "artist-corrections.json");
    writeFileSync(
      correctionsPath,
      JSON.stringify({
        p1: [{ placeId: "p1", artistId: "b", action: "remove_artist_relation", status: "approved", reason: "x", proposedAt: "t0" }],
      })
    );
    applyApprovedArtistCorrections(placesPath, correctionsPath);
    const places = JSON.parse(readFileSync(placesPath, "utf-8"));
    expect(places[0].other).toBe("untouched-value");
  });

  it("승인된 제안이 없으면 아무 파일도 쓰지 않는다(no-op)", () => {
    const dir = tmpDirPath();
    const placesPath = writePlaces(dir, [{ place_id: "p1", artist_ids: ["a"] }]);
    const correctionsPath = join(dir, "artist-corrections.json");
    proposeArtistCorrection({ placeId: "p1", artistId: "a", action: "remove_artist_relation", reason: "x" }, correctionsPath);
    const before = readFileSync(placesPath, "utf-8");
    applyApprovedArtistCorrections(placesPath, correctionsPath);
    expect(readFileSync(placesPath, "utf-8")).toBe(before);
  });

  it("재실행해도 이미 applied된 항목은 다시 건드리지 않는다(멱등)", () => {
    const dir = tmpDirPath();
    const placesPath = writePlaces(dir, [{ place_id: "p1", artist_ids: ["a", "b"] }]);
    const correctionsPath = join(dir, "artist-corrections.json");
    writeFileSync(
      correctionsPath,
      JSON.stringify({
        p1: [{ placeId: "p1", artistId: "b", action: "remove_artist_relation", status: "approved", reason: "x", proposedAt: "t0" }],
      })
    );
    applyApprovedArtistCorrections(placesPath, correctionsPath);
    const secondRun = applyApprovedArtistCorrections(placesPath, correctionsPath);
    expect(secondRun.appliedCount).toBe(0); // 이미 applied라 다시 안 잡힘
  });
});

describe("reclassifyArtistCorrection — provenance vs contradiction 정책 수정", () => {
  it("remove_artist_relation 제안을 provenance_missing/needs_evidence_recovery로 재분류해도 status는 proposed 그대로다", () => {
    const dir = tmpDirPath();
    const correctionsPath = join(dir, "artist-corrections.json");
    proposeArtistCorrection(
      { placeId: "p1", artistId: "nct", action: "remove_artist_relation", reason: "현재 citation에 없음" },
      correctionsPath
    );

    reclassifyArtistCorrection(
      "p1",
      "nct",
      {
        disposition: "provenance_missing",
        newAction: "needs_evidence_recovery",
        supersededReason: "preview는 이미 human-reviewed baseline — 현재 citation 부재만으로 제거 근거가 되지 않음",
      },
      correctionsPath
    );

    const entry = loadArtistCorrections(correctionsPath)["p1"][0];
    expect(entry.status).toBe("proposed"); // 재분류도 승인이 아니다
    expect(entry.action).toBe("needs_evidence_recovery");
    expect(entry.disposition).toBe("provenance_missing");
  });

  it("원래 제안(action/reason)을 originalAction에 보존한다 — 감사 이력을 지우지 않는다", () => {
    const dir = tmpDirPath();
    const correctionsPath = join(dir, "artist-corrections.json");
    proposeArtistCorrection(
      { placeId: "p1", artistId: "nct", action: "remove_artist_relation", reason: "현재 citation에 없음" },
      correctionsPath
    );
    reclassifyArtistCorrection(
      "p1",
      "nct",
      { disposition: "provenance_missing", newAction: "needs_evidence_recovery", supersededReason: "정책 수정" },
      correctionsPath
    );
    const entry = loadArtistCorrections(correctionsPath)["p1"][0];
    expect(entry.originalAction).toBe("remove_artist_relation");
    expect(entry.reason).toBe("현재 citation에 없음"); // 원래 사유도 그대로 남는다
    expect(entry.supersededReason).toBeTruthy();
  });

  it("재분류된(needs_evidence_recovery) 제안은 승인되어도 artistIds를 제거하지 않는다", () => {
    const dir = tmpDirPath();
    const placesPath = writePlaces(dir, [{ place_id: "p1", artist_ids: ["bts", "nct"] }]);
    const correctionsPath = join(dir, "artist-corrections.json");
    proposeArtistCorrection(
      { placeId: "p1", artistId: "nct", action: "remove_artist_relation", reason: "현재 citation에 없음" },
      correctionsPath
    );
    reclassifyArtistCorrection(
      "p1",
      "nct",
      { disposition: "provenance_missing", newAction: "needs_evidence_recovery", supersededReason: "정책 수정" },
      correctionsPath
    );
    // 재분류 후 실수로 승인되더라도(정책상 일어나지 않아야 하지만) artistIds는 안전하다.
    const corrections = loadArtistCorrections(correctionsPath);
    corrections["p1"][0].status = "approved";
    writeFileSync(correctionsPath, JSON.stringify(corrections));

    applyApprovedArtistCorrections(placesPath, correctionsPath);
    const places = JSON.parse(readFileSync(placesPath, "utf-8"));
    expect(places[0].artist_ids).toEqual(["bts", "nct"]); // 그대로 — remove_artist_relation이 아니므로
  });

  it("대상 제안이 없으면 아무것도 하지 않는다", () => {
    const dir = tmpDirPath();
    const correctionsPath = join(dir, "artist-corrections.json");
    const result = reclassifyArtistCorrection(
      "nope",
      "nct",
      { disposition: "provenance_missing", newAction: "needs_evidence_recovery", supersededReason: "x" },
      correctionsPath
    );
    expect(result).toEqual({});
  });
});
