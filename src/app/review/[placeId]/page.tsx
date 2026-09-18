import Link from "next/link";
import { notFound } from "next/navigation";
import { loadReviewRecords } from "@/lib/review/reviewData";
import { filterReviewRecords, type ReviewFilters } from "@/lib/review/reviewFilters";
import { getArtistById } from "@/data/artists";
import { getQuestsForPlace } from "@/data/quests";
import { getFactualBlockers, getProvenanceOnlyReasons } from "@/lib/review/targetedReview";
import { loadArtistCorrections } from "@/lib/review/artistCorrectionStore";
import ReviewActionsPanel from "../ReviewActionsPanel";

export const dynamic = "force-dynamic";

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
  };
}

function toQueryString(sp: SearchParams): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const section: React.CSSProperties = { marginBottom: 20 };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase" };
const value: React.CSSProperties = { fontSize: 14, marginTop: 2 };

export default async function PlaceReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { placeId } = await params;
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const allRecords = loadReviewRecords();
  const filtered = filterReviewRecords(allRecords, filters);

  const record = allRecords.find((r) => r.place.id === placeId);
  if (!record) notFound();

  const idx = filtered.findIndex((r) => r.place.id === placeId);
  const prev = idx > 0 ? filtered[idx - 1] : null;
  const next = idx >= 0 && idx < filtered.length - 1 ? filtered[idx + 1] : null;
  const qs = toQueryString(sp);

  const artistNames = record.place.artistIds
    .map((id) => getArtistById(id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => `${a.name} (${a.nameEn})`)
    .join(", ");
  const quests = getQuestsForPlace({ ...record.place, questIds: [] });
  const factualBlockers = getFactualBlockers(record);
  const provenanceOnlyReasons = getProvenanceOnlyReasons(record);
  const corrections = loadArtistCorrections()[record.place.id] ?? [];

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 13 }}>
        <Link href={`/review${qs}`}>&larr; Back to list</Link>
        <div style={{ display: "flex", gap: 12 }}>
          {prev ? <Link href={`/review/${prev.place.id}${qs}`}>&larr; Prev</Link> : <span style={{ color: "#ccc" }}>&larr; Prev</span>}
          <span>
            {idx + 1} / {filtered.length}
          </span>
          {next ? <Link href={`/review/${next.place.id}${qs}`}>Next &rarr;</Link> : <span style={{ color: "#ccc" }}>Next &rarr;</span>}
        </div>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700 }}>{record.place.nameEn || record.place.nameKo}</h1>
      <p style={{ fontSize: 13, color: "#666" }}>{record.place.id}</p>

      {record.status !== "draft" && record.decision?.verificationBasis && (
        <p style={{ fontSize: 13, background: "#eafaf1", padding: 8, borderRadius: 6, marginBottom: 12 }}>
          {record.decision.verificationBasis === "preview-human-review-migration"
            ? "✓ VERIFIED FROM PRIOR PREVIEW REVIEW — "
            : record.decision.verificationBasis === "manual-review-after-remediation"
              ? "✓ MANUALLY VERIFIED AFTER REMEDIATION — "
              : "✓ MANUALLY VERIFIED — "}
          {record.decision.verificationNote || record.decision.note}
        </p>
      )}
      {factualBlockers.length > 0 && (
        <p style={{ fontSize: 13, background: "#fdecea", padding: 8, borderRadius: 6, marginBottom: 12, color: "#c0392b" }}>
          ⚠ FACTUAL REVIEW BLOCKER — {factualBlockers.join(", ")} (blocks verified status)
        </p>
      )}
      {provenanceOnlyReasons.length > 0 && (
        <p style={{ fontSize: 13, background: "#eaf2fb", padding: 8, borderRadius: 6, marginBottom: 12, color: "#2980b9" }}>
          ℹ PROVENANCE GAP — {provenanceOnlyReasons.join(", ")} (traceability only — does not block or reflect on
          factual verified status)
        </p>
      )}

      <section style={section}>
        <p style={label}>Identity</p>
        <div style={value}>
          {record.place.nameKo} / {record.place.nameEn}
          <br />
          {record.place.latitude}, {record.place.longitude} — {record.place.category}
        </div>
      </section>

      <section style={section}>
        <p style={label}>Artist relation (STARA-owned — the only evidence of relevance)</p>
        <div style={value}>
          <b>Artists:</b> {artistNames || "(none)"}
          <br />
          <b>relationTextKo:</b> {record.place.relationTextKo}
          <br />
          <b>relationTextEn:</b> {record.place.relationTextEn}
          <br />
          <b>sourceUrl:</b>{" "}
          {record.metadata.sourceUrl ? (
            record.metadata.sourceUrl.startsWith("http") ? (
              <a href={record.metadata.sourceUrl} target="_blank" rel="noreferrer">
                {record.metadata.sourceUrl}
              </a>
            ) : (
              <span style={{ color: "#c0392b" }}>{record.metadata.sourceUrl} (not a URL)</span>
            )
          ) : (
            <span style={{ color: "#c0392b" }}>missing</span>
          )}
        </div>
      </section>

      {record.citation && (
        <section style={section}>
          <p style={label}>
            Citation / provenance research (traceability only — never changes editorial status or relationship
            validity)
          </p>
          <div style={value}>
            <b>citationStatus:</b>{" "}
            <span style={{ color: record.citation.citationStatus === "wrong" ? "#c0392b" : undefined }}>
              {record.citation.citationStatus}
            </span>
            {record.citation.citationStatus === "wrong" && (
              <span style={{ color: "#c0392b" }}> — ⚠ contradicted: current evidence actively conflicts with the stored claim</span>
            )}
            {record.citation.citationStatus === "unreviewed" && (
              <span style={{ color: "#999" }}> — provenance not yet traced (not evidence the relationship is false)</span>
            )}
            {["partial", "weak", "broken"].includes(record.citation.citationStatus) && (
              <span style={{ color: "#999" }}> — provenance incomplete (not evidence the relationship is false)</span>
            )}
            {record.citation.relationOverclaim && (
              <span style={{ color: "#e67e22" }}>
                {" "}
                — ⚠ relationText may state more than the currently preserved source establishes (provenance gap, not
                a factual finding — the underlying claim may still be true from the original human review)
              </span>
            )}
            {record.citation.koEnMismatch && <span style={{ color: "#e67e22" }}> — ⚠ ko/en mismatch</span>}
            {record.citation.citationNote && (
              <>
                <br />
                {record.citation.citationNote}
              </>
            )}
            {record.citation.researchNote && (
              <>
                <br />
                <span style={{ color: "#999", fontSize: 12 }}>{record.citation.researchNote}</span>
              </>
            )}
            {record.citation.suggestedQueryKo && (
              <>
                <br />
                <b>Suggested search:</b> &ldquo;{record.citation.suggestedQueryKo}&rdquo; / &ldquo;
                {record.citation.suggestedQueryEn}&rdquo;
              </>
            )}
          </div>
        </section>
      )}

      {corrections.length > 0 && (
        <section style={section}>
          <p style={label}>
            Artist relation review (proposal only — requires explicit reviewer approval to change artistIds; preview
            is treated as a human-reviewed baseline, so absence of current provenance never removes a relationship
            automatically)
          </p>
          {corrections.map((c, i) => {
            const actionLabel =
              c.action === "remove_artist_relation"
                ? "Current evidence contradicts — proposed removal"
                : c.action === "needs_evidence_recovery"
                  ? "Needs evidence recovery"
                  : "Attach stronger citation";
            const dispositionLabel =
              c.disposition === "contradicted"
                ? "CONTRADICTED"
                : c.disposition === "unresolved"
                  ? "UNRESOLVED"
                  : c.disposition === "provenance_missing"
                    ? "PROVENANCE INCOMPLETE — relationship retained"
                    : undefined;
            const dispositionColor =
              c.disposition === "contradicted" ? "#c0392b" : c.disposition === "unresolved" ? "#e67e22" : "#2980b9";
            return (
              <div key={`${c.artistId}-${i}`} style={{ ...value, marginBottom: i < corrections.length - 1 ? 10 : 0 }}>
                <b>{c.artistId}:</b> {actionLabel}
                {dispositionLabel && (
                  <span style={{ color: dispositionColor, marginLeft: 6, fontWeight: 700 }}>[{dispositionLabel}]</span>
                )}
                <span style={{ color: "#999", marginLeft: 6 }}>({c.status})</span>
                <br />
                {c.reason}
                {c.originalAction && (
                  <>
                    <br />
                    <span style={{ color: "#999", fontSize: 12 }}>
                      Originally proposed: {c.originalAction} — superseded {c.supersededAt}. {c.supersededReason}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section style={section}>
        <p style={label}>Operability</p>
        <div style={value}>
          Hours: {record.place.openTime && record.place.closeTime ? `${record.place.openTime}–${record.place.closeTime}` : "unspecified"}
          <br />
          Dwell: {record.place.dwellMinutes} min
          <br />
          Quest: {quests[0]?.titleEn} — {quests[0]?.descriptionEn}
        </div>
      </section>

      <section style={section}>
        <p style={label}>KTO supporting data (informational only — never evidence of artist relevance)</p>
        <div style={value}>
          Korean match: {record.enrichment?.status ?? "unmatched"}
          {record.enrichment?.koContentId && ` (koContentId: ${record.enrichment.koContentId})`}
          <br />
          English match: {record.enrichment?.enStatus ?? "unavailable"}
          {record.enrichment?.enOverview && (
            <>
              <br />
              Overview: {record.enrichment.enOverview}
            </>
          )}
          {record.enrichment?.enAddress && (
            <>
              <br />
              Address: {record.enrichment.enAddress}
            </>
          )}
          {(record.enrichment?.images?.length ?? 0) > 0 && (
            <>
              <br />
              Images: {record.enrichment!.images!.length}
            </>
          )}
        </div>
      </section>

      {(record.verify.errors.length > 0 || record.verify.warnings.length > 0) && (
        <section style={section}>
          <p style={label}>Structural / factual checks (blocks verified status)</p>
          {record.verify.errors.map((e) => (
            <div key={e} style={{ color: "#c0392b", fontSize: 13 }}>
              ✗ {e}
            </div>
          ))}
          {record.verify.warnings.map((w) => (
            <div key={w} style={{ color: "#e67e22", fontSize: 13 }}>
              ⚠ {w}
            </div>
          ))}
        </section>
      )}

      {record.provenance.errors.length > 0 && (
        <section style={section}>
          <p style={label}>Provenance checks (sourceUrl — traceability only, does not block verified status)</p>
          {record.provenance.errors.map((e) => (
            <div key={e} style={{ color: "#2980b9", fontSize: 13 }}>
              ℹ {e}
            </div>
          ))}
        </section>
      )}

      {record.decision?.needsReReview && (
        <p style={{ color: "#e67e22", fontSize: 13, fontWeight: 700 }}>⚠ Flagged for re-review: {record.decision.note}</p>
      )}

      <ReviewActionsPanel
        placeId={record.place.id}
        status={record.status}
        verifyErrors={record.verify.errors}
        publishErrors={record.publish.errors}
        hasDecision={!!record.decision}
      />
    </div>
  );
}
