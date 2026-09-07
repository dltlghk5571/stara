# STARA i18n (English / Korean) — Design

Date: 2026-09-07
Status: Approved for planning

## Problem

STARA targets foreign visitors, but the running app mixes English and Korean
UI text with no way to choose a language. We need a full English/Korean
toggle where **each mode shows only that language** across every screen, and
where the Korea Tourism API is queried in the matching language (the
`EngService2` / `KorService2` split already exists server-side).

## Goals

- One locale (`en` default, `ko` optional) drives **all** UI text, all
  displayed domain data (place / quest / region / route / artist names and
  descriptions), and the tourism API language.
- Full coverage in a single pass — English mode has no leftover Korean.
- No structural upheaval: no `[locale]` route segment, no new middleware, no
  URL change, no new runtime dependency.

## Non-goals (YAGNI)

- Locale in the URL, locale routing middleware, `Accept-Language` detection.
- More than two languages; RTL; lazy-loaded dictionaries.
- A translation-management / message-extraction toolchain — dictionaries are
  hand-maintained TypeScript modules.
- A language toggle on post-login screens (see Limitations).

## Current state (survey)

Already in place:

- `Locale = "ko" | "en"` (`src/lib/tour-api/types.ts`).
- `tourismDataProvider` (`src/lib/tour-api/provider.ts`) picks
  `EngService2` / `KorService2` by `locale`, with an empty-result fallback
  to Korean.
- `/api/tourism/nearby|detail|images` already read `?locale=`; `/search` and
  `/related` do not.
- Domain data is already bilingual: `Place.nameKo/nameEn`,
  `Place.relationTextKo/relationTextEn`, `Quest.titleKo/titleEn`,
  `Quest.descriptionKo/descriptionEn`, `Region.descriptionKo/descriptionEn`,
  `StaraRoute.nameKo/nameEn`, `Artist.name`(ko)/`Artist.nameEn`.

Missing:

- Client-side locale state, persistence, and toggle UI.
- Client `/api/tourism/*` calls never send `locale` (server defaults to `ko`).
- ~27 `.tsx` files contain hardcoded Korean UI strings (~hundreds of
  distinct strings). No Korean in CSS `content:`.
- Components read `nameKo` / `descriptionKo` directly instead of by locale.

## Approach

Custom lightweight locale layer under `src/i18n/`. No library.

### 1. Locale mechanism

- **Source of truth: cookie `stara_locale`** — value `"en"` or `"ko"`,
  default `"en"` when absent or invalid.
- `src/app/layout.tsx` (server component): read the cookie via
  `cookies()`, set `<html lang={locale}>`, and wrap `children` in
  `<LocaleProvider initialLocale={locale}>`.
- `src/i18n/LocaleProvider.tsx` (`"use client"`): React context holding
  `{ locale, setLocale }`. `setLocale(next)` writes the cookie
  (`document.cookie`, `path=/`, 1-year max-age) and calls
  `location.reload()`. Reload is acceptable because the toggle only exists
  on the pre-app splash / sign-in screens; it guarantees server components,
  metadata, and API-call defaults all pick up the change with zero extra
  wiring.
- `src/i18n/index.ts` exports:
  - `useLocale(): Locale` — from context.
  - `useT(): (key: string, vars?: Record<string, string | number>) => string`
    — bound to the current locale's dictionary.
  - `getDictionary(locale: Locale): Dict` — sync, no context, for server
    components / non-hook call sites.
  - `readLocaleCookie(): Locale` — client helper for non-React code (e.g.
    building an API URL outside a component); reads `document.cookie`.

### 2. Dictionary

- `src/i18n/dictionaries/en.ts` is the **type source**:
  `export const en = { ... } as const; export type Dict = typeof en;`
- `src/i18n/dictionaries/ko.ts`: `export const ko: Dict = { ... }` — the
  `: Dict` annotation makes a missing/renamed key a compile error.
- Nested, organised by screen/area:
  `common`, `splash`, `signIn`, `onboarding` (`.artists`, `.region`,
  `.regionDetail`, `.generate`), `trip`, `mission`, `edit`, `collection`,
  `stamps`, `diary`, `map`, `schedule`.
- Key lookup: dotted path (`"onboarding.region.title"`). Missing key →
  return the key string and `console.warn` in dev only.
- Interpolation: `t("edit.addConfirm", { name })` replaces `{name}` tokens.
  Small pure helper `interpolate(template, vars)`.
- English copy: written as part of implementation — concise, idiomatic,
  consistent K-travel product tone. Korean copy = the strings lifted from
  the current components.

### 3. Data localization helpers (`src/i18n/localize.ts`)

Pure functions, each falling back to Korean when the English field is blank
(covers TourAPI / KTO-sourced places whose `nameEn` may be empty):

- `placeName(place, locale)`, `placeRelation(place, locale)`
- `questTitle(quest, locale)`, `questDesc(quest, locale)`
- `regionDesc(region, locale)`
- `routeName(route, locale)`
- `artistName(artist, locale)`

No change to `Place` or any other schema — these only *read* existing
fields. (Respects the "Place data schema — do not change" rule in CLAUDE.md.)

### 4. API locale plumbing

Thread the current locale into every client tourism fetch as `&locale=`:

- `src/app/edit/page.tsx` (`nearby`, `search`)
- `src/app/onboarding/region/[regionId]/RegionDetailClient.tsx` (`nearby`)
- `src/components/reels/PlaceDetailSheet.tsx` (`detail`, `images`)
- `src/lib/tour-api/useTourismCandidates.ts` (`nearby`)
- `src/lib/tour-api/useRouteOptions.ts` (`nearby`)
- `src/lib/tour-api/useRelatedTourismSignal.ts` (`related` — POST body)

Add `locale` handling to the `/api/tourism/search` and `/api/tourism/related`
route handlers (mirror the three that already have it). Server
`tourismDataProvider` is unchanged.

### 5. Toggle UI

- `src/i18n/LocaleToggle.tsx` — a small `EN | KO` segmented control in the
  kroute pill visual language (`2.5px` border, hard shadow). Calls
  `setLocale`.
- Placed on `src/app/page.tsx` (splash) and
  `src/app/sign-in/[[...sign-in]]/page.tsx` (splash links straight into
  sign-in, so a visitor can switch on either).
- Default `en`. Selecting a language sets the cookie and reloads.

### 6. `<html lang>` and metadata

- `layout.tsx` sets `lang` from the cookie.
- Static `metadata` (title/description) becomes English (matches the `en`
  default). Not made locale-aware — low value, and `generateMetadata`
  reading cookies would defeat static optimization.

### 7. Dates / numbers

Where a date is rendered (collection gallery, diary), format with
`toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US")`. Few sites.

## Testing

- `src/i18n/localize.test.ts` — Korean fallback when English field empty;
  correct field chosen per locale.
- `src/i18n/t.test.ts` — dotted-path lookup, `{token}` interpolation,
  missing-key returns key.
- `src/i18n/dictionary-parity.test.ts` — recursively assert `ko` and `en`
  have the identical set of key paths (the safety net for full coverage).
- All existing 39 tests keep passing (they assert Korean data values like
  `nameKo === "경복궁"` — unaffected, helpers are additive).
- A grep-based check in the plan's final step: no `[가-힣]` left in
  `src/**/*.tsx` outside `src/i18n/dictionaries/ko.ts` and data files.

## Components touched (string extraction)

All 27 `.tsx` files with hardcoded Korean. Grouped for the plan:

1. Splash + auth: `app/page.tsx`, `app/sign-in/...`, `app/sign-up/...`
2. Onboarding: `app/onboarding/artists`, `region`, `region/[regionId]` +
   `RegionDetailClient`, `generate`
3. Trip shell: `components/trip/TripShellClient`, `MissionSheet`
4. Edit: `app/edit/page.tsx` + `components/reels/*`,
   `components/route/ScheduleFooter`, `components/quest/SubQuestList`
5. Collection: `app/collection/page.tsx`, `app/collection/[username]`,
   `components/collection/*`, `app/api/collection-card/[username]` (OG card
   — locale from query param, defaults `en`)
6. Stamps / map / misc: `components/stamp/StampGrid`,
   `components/map/*`, `components/layout/*`, `app/complete/page.tsx`

## Limitations / follow-ups

- No language toggle after login. Adding one to `TopBar` (`rightSlot`) +
  making `setLocale` do `router.refresh()` instead of full reload is a small
  follow-up if in-app switching is wanted.
- OG collection card: rendered server-side via `next/og`; it will read
  `?locale=` (default `en`). Share links won't carry the viewer's locale
  unless the share URL builder adds it — noted, not solved here.
