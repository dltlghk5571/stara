// KTO(TourAPI) 응답 텍스트에 섞여 오는 HTML 엔티티(&ldquo; 등)를 순수 텍스트로 푼다.
// dangerouslySetInnerHTML은 쓰지 않는다 — KTO 텍스트를 신뢰할 수 있는 HTML로 취급하지 않고,
// 엔티티만 해당 문자로 치환할 뿐 태그는 절대 만들지 않는다(항상 텍스트로만 렌더링됨).
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  mdash: "—",
  ndash: "–",
  hellip: "…",
};

export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity[0] === "#") {
      const codePoint =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}
