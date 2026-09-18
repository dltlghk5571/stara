import { describe, expect, it } from "vitest";
import { decodeHtmlEntities } from "./decodeHtmlEntities";

describe("decodeHtmlEntities", () => {
  it("이름 있는 엔티티를 원래 문자로 바꾼다", () => {
    expect(decodeHtmlEntities("&ldquo;HOW YOU LIKE THAT&rdquo;")).toBe("“HOW YOU LIKE THAT”");
    expect(decodeHtmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("숫자 엔티티(10진/16진)를 바꾼다", () => {
    expect(decodeHtmlEntities("It&#39;s")).toBe("It's");
    expect(decodeHtmlEntities("It&#x27;s")).toBe("It's");
  });

  it("엔티티가 없는 일반 텍스트는 그대로 둔다", () => {
    expect(decodeHtmlEntities("Gyeongbokgung Palace")).toBe("Gyeongbokgung Palace");
  });

  it("알 수 없는 엔티티는 원문 그대로 남긴다(날조하지 않음)", () => {
    expect(decodeHtmlEntities("&unknownEntity;")).toBe("&unknownEntity;");
  });

  it("HTML 태그를 만들지 않는다 — 텍스트 치환만 한다(<script> 같은 입력도 안전)", () => {
    const input = "&lt;script&gt;alert(1)&lt;/script&gt;";
    const result = decodeHtmlEntities(input);
    expect(result).toBe("<script>alert(1)</script>");
    // 이 결과는 여전히 '문자열'일 뿐 — 호출부가 dangerouslySetInnerHTML로 쓰지 않는 한 태그로 해석되지 않는다.
    expect(typeof result).toBe("string");
  });

  it("빈 문자열은 빈 문자열 그대로", () => {
    expect(decodeHtmlEntities("")).toBe("");
  });

  it("이중 인코딩된 엔티티는 한 번만 풀린다 — 두 번 호출해야만 완전히 풀린다(재귀 디코딩 안 함)", () => {
    // &amp;ldquo; 는 "&ldquo;"의 이중 인코딩 형태. 한 번의 decodeHtmlEntities 호출은
    // &amp; -> & 까지만 풀어야 한다(결과: 리터럴 문자열 "&ldquo;") — 재귀적으로 한 번 더
    // 파고들어 실제 따옴표 문자(“)까지 만들어버리면, 이 함수가 두 개의 서로 다른 디코딩
    // 경계(예: mapper.ts와 placePresentation.ts)를 통해 우연히 두 번 불렸을 때 원문이 과하게
    // 풀리는 사고를 이 테스트가 못 잡게 된다.
    const onceDecoded = decodeHtmlEntities("&amp;ldquo;");
    expect(onceDecoded).toBe("&ldquo;");
    expect(onceDecoded).not.toBe("“");
    // 같은 문자열을 실수로 두 번 호출하면(경계가 중복되는 버그 상황) 그제서야 완전히 풀린다 —
    // 즉 "한 경계에서 한 번만 호출"이 지켜지는 한 실제 콘텐츠에 이런 과잉 디코딩은 나타나지 않는다.
    expect(decodeHtmlEntities(onceDecoded)).toBe("“");
  });
});
