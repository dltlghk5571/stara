import Link from "next/link";
import { loadReviewRecords } from "@/lib/review/reviewData";
import { filterReviewRecords, type ReviewFilters } from "@/lib/review/reviewFilters";
import { summarizeReviewRecords } from "@/lib/review/reviewSummary";
import { getTargetedReviewReasons, getFactualBlockers } from "@/lib/review/targetedReview";
import { SEOUL_ARTISTS } from "@/data/generated/seoulArtists";

export const dynamic = "force-dynamic"; // 매 요청마다 review-decisions.json을 새로 읽는다.

interface SearchParams {
  status?: string;
  artist?: string;
  category?: string;
  missingSourceUrl?: string;
  missingEnglishRelation?: string;
  missingHours?: string;
  koStatus?: string;
  enStatus?: string;
  needsAttention?: string;
  citationStatus?: string;
  relationOverclaim?: string;
  koEnMismatch?: string;
  needsTargetedReview?: string;
  verificationBasis?: string;
  hasProvenanceGap?: string;
  draftReason?: string;
}

function parseFilters(sp: SearchParams): ReviewFilters {
  return {
    status: sp.status ? (sp.status as ReviewFilters["status"]) : undefined,
    artist: sp.artist || undefined,
    category: sp.category ? (sp.category as ReviewFilters["category"]) : undefined,
    missingSourceUrl: sp.missingSourceUrl === "1",
    missingEnglishRelation: sp.missingEnglishRelation === "1",
    missingHours: sp.missingHours === "1",
    koStatus: sp.koStatus ? (sp.koStatus as ReviewFilters["koStatus"]) : undefined,
    enStatus: sp.enStatus ? (sp.enStatus as ReviewFilters["enStatus"]) : undefined,
    needsAttention: sp.needsAttention === "1",
    citationStatus: sp.citationStatus ? (sp.citationStatus as ReviewFilters["citationStatus"]) : undefined,
    relationOverclaim: sp.relationOverclaim === "1",
    koEnMismatch: sp.koEnMismatch === "1",
    needsTargetedReview: sp.needsTargetedReview === "1" ? true : sp.needsTargetedReview === "0" ? false : undefined,
    verificationBasis: sp.verificationBasis ? (sp.verificationBasis as ReviewFilters["verificationBasis"]) : undefined,
    hasProvenanceGap: sp.hasProvenanceGap === "1" ? true : sp.hasProvenanceGap === "0" ? false : undefined,
    draftReason: sp.draftReason ? (sp.draftReason as ReviewFilters["draftReason"]) : undefined,
  };
}

const th: React.CSSProperties = { textAlign: "left", padding: "6px 10px", borderBottom: "2px solid #333", fontSize: 12 };
const td: React.CSSProperties = { padding: "6px 10px", borderBottom: "1px solid #eee", fontSize: 13 };

export default async function ReviewDashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const records = loadReviewRecords();
  const summary = summarizeReviewRecords(records);
  const filtered = filterReviewRecords(records, filters);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Seoul place review</h1>
      <p style={{ fontSize: 13, color: "#666" }}>
        draft → verified → published은 여기서만 바꾼다. 자동 승격 없음 — 모든 상태 변경은 리뷰어의
        명시적 액션이다. KTO 매칭은 참고 정보일 뿐, 아티스트 관계의 증거는 sourceUrl뿐이다.
        <br />
        previewdata는 이미 사람이 여러 근거로 검토한 human-reviewed baseline이다 — citation 감사는
        provenance(추적 가능성) 감사이지, 관계 삭제 근거가 아니다. &ldquo;현재 citation에 없음&rdquo;은
        &ldquo;거짓&rdquo;이 아니라 &ldquo;출처를 지금 재구성 못 함&rdquo;을 뜻한다.
      </p>

      <section style={{ display: "flex", gap: 24, flexWrap: "wrap", margin: "16px 0", fontSize: 13 }}>
        <div>
          <b>TOTAL</b>: {summary.total}
        </div>
        <div>
          <b>EDITORIAL STATUS</b> (factual review — independent of provenance): draft {summary.byStatus.draft} ·
          verified {summary.byStatus.verified} (migrated from prior preview review{" "}
          {summary.byVerificationBasis["preview-human-review-migration"] ?? 0} · manually verified{" "}
          {(summary.byVerificationBasis["manual-review"] ?? 0) +
            (summary.byVerificationBasis["manual-review-after-remediation"] ?? 0)}
          ) · published {summary.byStatus.published}
        </div>
        <div>
          <b>PROVENANCE AMONG VERIFIED</b> (a verified record can still have a provenance gap — that is not an
          error): current evidence supported {summary.provenanceAmongVerified.current_evidence_supported} ·
          provenance missing {summary.provenanceAmongVerified.provenance_missing} · partial{" "}
          {summary.provenanceAmongVerified.partial} · weak {summary.provenanceAmongVerified.weak} · broken{" "}
          {summary.provenanceAmongVerified.broken}
        </div>
        <div>
          <b>DRAFT REASONS</b>: contradiction/unresolved {summary.draftReasons.contradiction} ·
          structural/factual defect {summary.draftReasons.structural}
        </div>
        <div>
          <b>NEEDS TARGETED REVIEW</b>: {summary.needsTargetedReviewCount} unique records (includes provenance-only
          flags that do not block verified status)
        </div>
        <div>
          <b>WARNINGS</b>: no sourceUrl {summary.warnings.missingSource} · no hours {summary.warnings.missingHours} ·
          no image {summary.warnings.missingImage} · no EN relation {summary.warnings.missingEnglishRelation} · KTO
          manual_review {summary.warnings.ktoManualReview} · KTO ambiguous {summary.warnings.ktoAmbiguous} · no KTO
          match {summary.warnings.noKtoMatch} (informational only — not a publish blocker)
        </div>
        <div>
          <b>CITATION STATUS</b>: direct {summary.byCitationStatus.direct} · partial{" "}
          {summary.byCitationStatus.partial} · weak {summary.byCitationStatus.weak} · broken{" "}
          {summary.byCitationStatus.broken} · wrong {summary.byCitationStatus.wrong} · unreviewed{" "}
          {summary.byCitationStatus.unreviewed}
        </div>
        <div>
          <b>RELATION ISSUES</b>: current-source overclaim {summary.relationOverclaimCount} · ko/en mismatch{" "}
          {summary.koEnMismatchCount} (provenance signals only — never changes editorial status or implies the
          relationship is false)
        </div>
      </section>

      <section style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, fontSize: 13 }}>
        <b>Editorial:</b>
        <Link href="/review?status=verified&hasProvenanceGap=0">Verified · complete provenance</Link>
        <Link href="/review?status=verified&hasProvenanceGap=1">Verified · provenance gaps</Link>
        <Link href="/review?status=draft&draftReason=contradiction">Draft · contradiction</Link>
        <Link href="/review?status=draft&draftReason=structural">Draft · structural/factual</Link>
      </section>
      <section style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, fontSize: 13 }}>
        <b>Provenance:</b>
        <Link href="/review?needsTargetedReview=1">Needs targeted review (any)</Link>
        <Link href="/review?citationStatus=wrong">Wrong attribution (contradicted)</Link>
        <Link href="/review?relationOverclaim=1">Current-source overclaim</Link>
        <Link href="/review?koEnMismatch=1">Ko/En mismatch</Link>
        <Link href="/review?citationStatus=unreviewed">Provenance missing</Link>
      </section>

      <details style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700 }}>BY CATEGORY / BY ARTIST</summary>
        <div style={{ display: "flex", gap: 32, marginTop: 8, fontSize: 13 }}>
          <div>
            {Object.entries(summary.byCategory).map(([c, n]) => (
              <div key={c}>
                {c}: {n}
              </div>
            ))}
          </div>
          <div>
            {Object.entries(summary.byArtist)
              .sort((a, b) => b[1] - a[1])
              .map(([a, n]) => (
                <div key={a}>
                  {a}: {n}
                </div>
              ))}
          </div>
        </div>
      </details>

      <form style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, fontSize: 13 }}>
        <select name="status" defaultValue={sp.status ?? ""}>
          <option value="">status: any</option>
          <option value="draft">draft</option>
          <option value="verified">verified</option>
          <option value="published">published</option>
        </select>
        <select name="artist" defaultValue={sp.artist ?? ""}>
          <option value="">artist: any</option>
          {SEOUL_ARTISTS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.id}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={sp.category ?? ""}>
          <option value="">category: any</option>
          {["photo", "food", "culture", "shopping", "experience"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select name="koStatus" defaultValue={sp.koStatus ?? ""}>
          <option value="">KTO(ko): any</option>
          <option value="matched">matched</option>
          <option value="unmatched">unmatched</option>
          <option value="manual_review">manual_review</option>
          <option value="ambiguous">ambiguous</option>
        </select>
        <label>
          <input type="checkbox" name="missingSourceUrl" value="1" defaultChecked={sp.missingSourceUrl === "1"} /> no
          sourceUrl
        </label>
        <label>
          <input
            type="checkbox"
            name="missingEnglishRelation"
            value="1"
            defaultChecked={sp.missingEnglishRelation === "1"}
          />{" "}
          no EN relation
        </label>
        <label>
          <input type="checkbox" name="missingHours" value="1" defaultChecked={sp.missingHours === "1"} /> no hours
        </label>
        <label>
          <input type="checkbox" name="needsAttention" value="1" defaultChecked={sp.needsAttention === "1"} /> needs
          attention (blocks verify)
        </label>
        <select name="citationStatus" defaultValue={sp.citationStatus ?? ""}>
          <option value="">citation: any</option>
          <option value="unreviewed">unreviewed</option>
          <option value="direct">direct</option>
          <option value="partial">partial</option>
          <option value="weak">weak</option>
          <option value="broken">broken</option>
          <option value="wrong">wrong</option>
        </select>
        <label>
          <input type="checkbox" name="relationOverclaim" value="1" defaultChecked={sp.relationOverclaim === "1"} />{" "}
          relation overclaim
        </label>
        <label>
          <input type="checkbox" name="koEnMismatch" value="1" defaultChecked={sp.koEnMismatch === "1"} /> ko/en
          mismatch
        </label>
        <label>
          <input
            type="checkbox"
            name="needsTargetedReview"
            value="1"
            defaultChecked={sp.needsTargetedReview === "1"}
          />{" "}
          needs targeted review
        </label>
        <select name="verificationBasis" defaultValue={sp.verificationBasis ?? ""}>
          <option value="">verified via: any</option>
          <option value="preview-human-review-migration">migrated from preview review</option>
          <option value="manual-review">manually verified</option>
          <option value="manual-review-after-remediation">verified after remediation</option>
        </select>
        <button type="submit">Filter</button>
        <Link href="/review">Clear</Link>
      </form>

      <p style={{ fontSize: 12, color: "#666" }}>{filtered.length} / {records.length} places shown</p>

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={th}>Place</th>
            <th style={th}>Status</th>
            <th style={th}>Category</th>
            <th style={th}>Artists</th>
            <th style={th}>sourceUrl</th>
            <th style={th}>KTO ko</th>
            <th style={th}>Citation</th>
            <th style={th}>Targeted review reasons</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const reasons = getTargetedReviewReasons(r);
            const blockers = getFactualBlockers(r);
            const hasProvenanceGapOnly = reasons.length > 0 && blockers.length === 0;
            const basisLabel =
              r.decision?.verificationBasis === "preview-human-review-migration"
                ? " (migrated)"
                : r.decision?.verificationBasis
                  ? " (manual)"
                  : "";
            const statusNote =
              (r.status === "verified" || r.status === "published") && hasProvenanceGapOnly
                ? " · provenance gap (still factually verified)"
                : "";
            return (
              <tr key={r.place.id}>
                <td style={td}>
                  <Link href={`/review/${r.place.id}`}>{r.place.nameEn || r.place.nameKo}</Link>
                </td>
                <td style={td}>
                  {r.status}
                  {basisLabel}
                  {statusNote && <span style={{ color: "#999" }}>{statusNote}</span>}
                </td>
                <td style={td}>{r.place.category}</td>
                <td style={td}>{r.place.artistIds.join(", ")}</td>
                <td style={td}>{r.metadata.sourceUrl ? "✓" : "—"}</td>
                <td style={td}>{r.enrichment?.status ?? "unmatched"}</td>
                <td
                  style={{
                    ...td,
                    color: r.citation?.citationStatus === "wrong" ? "#c0392b" : undefined,
                  }}
                >
                  {r.citation?.citationStatus ?? "unreviewed"}
                </td>
                <td style={{ ...td, color: blockers.length > 0 ? "#c0392b" : hasProvenanceGapOnly ? "#e67e22" : undefined }}>
                  {reasons.length > 0 ? reasons.join(", ") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
