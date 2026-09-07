import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");

/**
 * Paths that legitimately contain Korean and/or English source strings:
 * the dictionaries themselves, hand-collected place data, and the two lib
 * modules that carry Korean category/tour-api vocabulary.
 */
const ALLOW = [
  join("src", "i18n", "dictionaries"),
  join("src", "data"),
  join("src", "lib", "categoryStyle"),
  join("src", "lib", "tour-api"),
  // The language switcher lists each locale in its own script ("EN" / "한국어") —
  // that Korean label is intentional and correct in every locale.
  join("src", "i18n", "LocaleToggle"),
  // `reasonKo` copy: the field name in `src/types` fixes this string as Korean,
  // and it is not currently rendered anywhere (plumbed to the store, unused).
  join("src", "lib", "autoPlaceSelector"),
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(tsx|ts)$/.test(p) && !/\.test\.(tsx|ts)$/.test(p) ? [p] : [];
  });
}

/**
 * Strip line + block comments so Korean in comments doesn't trip the gate,
 * and strip negated regex character classes (e.g. the `[^가-힣A-Za-z0-9]`
 * in `onboarding/artists/page.tsx`'s `initialsOf`) — a range boundary in a
 * regex is not user-facing copy.
 */
function stripNonRendered(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/\[\^[^\]]*\]/g, "");
}

describe("no hardcoded Korean in rendered code", () => {
  it("every src file outside the allowlist is Korean-free (post-strip)", () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      if (ALLOW.some((a) => file.includes(a))) continue;
      const body = stripNonRendered(readFileSync(file, "utf8"));
      const m = body.match(/[가-힣]/);
      if (m) {
        const line = body.slice(0, body.indexOf(m[0])).split("\n").length;
        offenders.push(`${file.replace(ROOT, "src")}:${line}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * Hard tripwire for un-localized English that reaches the screen — the binding
 * ruling is "KO mode ENTIRELY Korean", so a new unwrapped English JSX literal
 * must fail CI just like hardcoded Korean does.
 *
 * DECISION: hard-fail (not freeze-the-snapshot). The conservative heuristic
 * below currently reports ZERO findings across every screen file, so there is
 * no false-positive backlog to grandfather — any offender it reports from here
 * on is a real regression. `ALLOWED_ENGLISH` is a small defensive set for
 * brand marks / technical tokens that are correct in every locale; it is
 * empty of real current findings today.
 *
 * Heuristic (kept deliberately narrow — under-flag over false-positive churn):
 *   - JSX text nodes `>Some Text<` starting with an uppercase letter
 *   - `placeholder=` / `aria-label=` / `title=` string literals
 *   - with a run of >=4 ASCII letters
 *   - NOT wrapped in `t(` / `translate(`
 *   - comments already stripped; className/style/other props not scanned
 * It DOES fire on an obvious regression like `<h2>Active Route</h2>`.
 */
const ALLOWED_ENGLISH = [
  "STARA", // the product name / brand mark — a proper noun, identical in every locale
  // (no other real findings today — the scan below reports zero)
];
/** true if the flagged text is only brand marks / hashtag tokens, no real copy. */
function isAllowed(text: string): boolean {
  let stripped = text.replace(/#[A-Za-z0-9_]+/g, " "); // `#`-hashtag fragments — tag tokens, not prose
  for (const word of ALLOWED_ENGLISH) {
    stripped = stripped.split(word).join(" ");
  }
  return !/[A-Za-z]{4,}/.test(stripped);
}

describe("no un-localized English in screens", () => {
  it("every screen JSX literal is wrapped in t() or an allowed brand mark", () => {
    const SCREEN = /(src\/app\/.*(page|layout)\.tsx|src\/app\/.*Client\.tsx|src\/components\/.*\.tsx)$/;
    // JSX text node on a single line: `>Some words<`. Regex can't truly parse
    // JSX, so we keep the match tight (no code punctuation) to cut the worst
    // false positives — TS generics like `useState<Foo>(null)` etc.
    const jsxText = />\s*([A-Z][A-Za-z][^<>{}()[\];=|&]*?[A-Za-z!?.])\s*</g;
    const attr = /(?:placeholder|aria-label|title)=\{?"([^"]*[A-Za-z]{4,}[^"]*)"/g;
    const offenders: string[] = [];

    for (const file of walk(ROOT)) {
      const rel = file.replace(process.cwd() + "/", "");
      if (!SCREEN.test(rel)) continue;
      if (ALLOW.some((a) => file.includes(a))) continue;
      const body = stripNonRendered(readFileSync(file, "utf8"));

      for (const [full, text] of body.matchAll(jsxText)) {
        if (/\b(t|translate)\(/.test(full)) continue;
        if (!/[A-Za-z]{4,}/.test(text)) continue;
        offenders.push(`${rel}  "${text.trim()}"`);
      }
      for (const [full, text] of body.matchAll(attr)) {
        if (/\{\s*(t|translate)\(/.test(full)) continue;
        offenders.push(`${rel}  ${full.split("=")[0]}="${text}"`);
      }
    }

    expect(offenders.filter((o) => !isAllowed(o))).toEqual([]);
  });
});
