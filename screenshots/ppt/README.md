# STARA Competition PPT Screenshots (Pages 8–18)

## Capture context

- Branch: `develop`
- Commit: `bfa1899` (`bfa1899b9b77899374ae0ae54e8327f0a2507951`)
- Base URL: `http://localhost:3001` (local dev server, not production — avoids affecting
  production analytics/state; hits the same real external APIs as production would)
- Locale: English (`stara_locale=en` cookie forced)
- Viewport: 1440 × 1000
- Account: tester account (`stara_qa+clerk_test@example.com`, Clerk `publicMetadata.role
  === "tester"`) — this is why every screenshot shows a **TEST MODE** badge in the top
  corner and the mission sheet shows "Test account · GPS check bypassed." This is
  unavoidable with this account: `bypassGpsMission`/`bypassTmoneyVerification` are a single
  bundle granted by the tester role (`src/lib/auth/verificationCapabilities.ts`) — there is
  no way to keep the GPS bypass (needed since Playwright isn't physically in Seoul) while
  hiding the badge. A non-tester account would need to physically stand at each real-world
  place to pass GPS, which isn't feasible for scripted capture.
- Tool: Playwright (installed ephemerally via `npx`, not added to `package.json`/repo
  dependencies — per instructions, no persistent dependency was added for this task)

## Summary

- **29 screenshots captured** across 10 of 11 requested pages.
- **1 page (P12) fully blocked** — feature exists only as an internal ranking signal, no
  user-facing recommendation UI exists to screenshot.
- **1 individual shot (P14_03) blocked** — the wait-for-open value is computed but never
  rendered in any component.
- **No code was changed.** Every finding below that reads "not exposed" or "mismatch" is
  reported, not patched — per instructions, this was a screenshot task, not a feature task.
- **External API usage**: no TMAP Transit / ODsay calls were made (the "View detailed
  transit route" button was deliberately never clicked). The TMAP driving-directions API
  (for the route polyline/map) and TourAPI (place search/nearby) fire as part of normal
  page loads — these are the same calls a real user's session would make, not
  screenshot-specific extra load.

## Known limitations affecting screenshot cleanliness

1. **"Compiling…" flash** — a couple of early probe screenshots (not the final ones kept
   here) showed a Next.js dev-mode HMR compile indicator in the bottom-left corner from
   Turbopack recompiling a route on first visit. None of the final kept screenshots have it,
   but if a reviewer wants a second pass to be extra sure, re-run with `next build && next
   start` instead of `next dev`.
2. **TEST MODE / GPS-bypass badges** — see account note above. Present on every
   authenticated screenshot; this is the honest state of testing with this account, not a
   bug.

## Screenshot manifest

| PPT Page | Filename | Screen | Status | Notes |
|---|---|---|---|---|
| 8 | p08_01_artist_selection.png | Onboarding — artist selection | DONE | BTS + ENHYPEN selected (pink border = selected state) |
| 8 | p08_02_region_selection.png | Onboarding — region detail | DONE | Seoul, representative artist ENHYPEN · 53 filming locations. (Not the bare region-picker map — see _drafts/p08_probe_region.png for that variant; the detail screen more clearly shows "selected region.") |
| 8 | p08_03_generated_artist_route.png | Onboarding — "Pick a route" | DONE | 3 real routes generated from BTS+ENHYPEN selection (Fan Highlights/K-Culture Explorer/Shop & Taste), all real named places (Bukchon Hanok Village, Gyeongbokgung Palace, etc.) — verified selectedArtistIds genuinely drive route generation, not generic tourism |
| 8 | p08_04_place_relation_detail.png | Route pin → relation detail sheet | DONE | Gyeongbokgung Palace, "Relationship with ENHYPEN, BTS, BLACKPINK" + real relation text |
| 9 | p09_01_category_filter_all.png | /edit "Find places" — all categories | DONE | **Taxonomy mismatch found, see below** — actual filter chips are Food/Photo/Culture/Shopping/Experience |
| 9 | p09_02_category_filtered_results.png | /edit "Find places" — Food only | DONE | Deselected all but Food; candidate count dropped 164→40, confirming real filtering (not cosmetic) |
| 10 | p10_01_checkpoint_before.png | /trip Route tab — next checkpoint | DONE | Bukchon Hanok Village, "GO NOW!" |
| 10 | p10_02_mission_sheet.png | Mission sheet — before photo | DONE | "Take a homage photo," upload prompt, relation text |
| 10 | p10_03_checkpoint_complete.png | Route tab after completion | DONE | Bukchon marked "Mission Complete ✓," next checkpoint unlocked, MovementGuide + T-money bonus quest now visible |
| 11 | p11_01_before_auto_supplement.png | "Pick a route" — original 5-stop plan | PARTIAL | Same image as p08_03 (Fan Highlights: 5 stops, all artist-linked) |
| 11 | p11_02_after_auto_supplement.png | Route checklist after confirming | PARTIAL | Route grew to 8+ stops — "Namsangol Hanok Village," "Soul (소울)," "Geumdwaeji Sikdang" appear, none in the original 5-stop plan → auto-supplementation is real and working. **But: no visible "AUTO ADDED"/"LOCAL PICK" badge exists anywhere in the UI.** `buildFinalOrder()` (`src/lib/autoPlaceSelector.ts`) returns `autoAddedPlaceIds`/`reasons` but zero components consume that data (`grep` confirms 0 UI references). Per instructions, no fake label was added to the screenshot — this pairing is the best honest evidence available (place-count/name comparison), not a labeled indicator. |
| 12 | — | — | **BLOCKED (B — UI NOT EXPOSED)** | Related-tourism ranking (`TarRlteTarService1`, `src/lib/tour-api/relatedTourism.ts`) is real and used internally as a scoring signal inside `buildFinalOrder`'s auto-supplementation — but it is *only* a ranking adjustment, never a user-facing "pick a related place" screen. `grep` for any related-tourism UI component returns zero matches. No screenshots captured; fabricating a "Related Picks" UI would misrepresent the product. |
| 13 | p13_01_place_to_add.png | /edit "Find places" — candidate card | DONE | Leeum Museum of Art, not yet in route |
| 13 | p13_02_add_to_route.png | After "Add to route" | DONE | Button flips to "Remove from route," ETA recalculates (83→81 min travel, finish 4:16→5:38 PM) |
| 13 | p13_03_optimized_insertion.png | "My route" map after insertion | DONE | Stop count 8→9; pin numbers 2–8 visibly reshuffle (not a naive append) — confirms `findBestInsertion`/`insertAtBestPosition` actually ran |
| 14 | p14_01_time_settings.png | Time-settings popup | DONE | Start 9:00 AM / End 9:00 PM steppers |
| 14 | p14_02_recalculated_schedule.png | Schedule bar after a route change | DONE | Reused p13_02's bottom bar (same recalculation evidence: travel/on-site/finish time all update live) |
| 14 | p14_03_wait_for_open.png | — | **BLOCKED (B — UI NOT EXPOSED)** | `scheduleCalculator.ts` computes `waitedForOpenMinutes` per stop but it is never rendered by any component (`grep` confirms). No per-stop arrival/wait breakdown exists anywhere in the UI — only the aggregate start/end/travel/dwell summary in `ScheduleFooter`. |
| 14 | p14_04_time_conflict.png | Conflict warning | DONE | Lowered end time to 2:00 PM → "Will run 221 min past end time (2:00 PM)" with a "Remove this place" suggestion CTA |
| 15 | p15_01_segment_bonus_quest.png | MovementGuide + bonus quest | DONE | "NEXT MOVE — Namsangol Hanok Village — Public transit · 15 min" + "BONUS · Verify T-money card" (detailed transit route was **not** expanded, to avoid a TMAP Transit API call) |
| 15 | p15_02_tmoney_or_bonus_quest.png | T-money challenge sheet | PARTIAL | Real T-money quest UI, but shows the tester "Complete test verification" bypass panel rather than the real photo-upload flow (same unavoidable tester-account constraint as above) |
| 15 | p15_03_place_mission_complete.png | Congratulations screen, 2nd checkpoint | DONE | Different checkpoint from P10 for variety; checklist shows 3 completed missions |
| 16 | p16_01_badge_progress.png | Badges tab | DONE | 6/12 badges, Food badges both earned, Shopping 0/5, Culture 2/10 — real mixed progress state (pre-existing account history, not fabricated) |
| 16 | p16_02_badge_unlock.png | — | SUBSTITUTE | No badge-unlock toast/modal exists anywhere in the code (`grep` confirms). Reused the "Mission Complete" congratulations screen as the closest analogous "completion" moment, per instructions' fallback guidance. Do not present this as a badge-specific UI. |
| 16 | p16_03_badge_collection.png | Badges tab, scrolled | DONE | Shows all 6 badge categories (Food/Shopping/Culture/Activity/Landmark/K-POP) — Landmark and K-POP both fully earned with gold-highlighted "EARNED" styling |
| 17 | p17_01_diary_overview.png | Diary tab | DONE | 7 trip cards (Seoul/Busan/Incheon), photo counts, share icon on every card |
| 17 | p17_02_trip_diary.png | Trip diary opened | DONE | "Seoul · K-Culture Explorer" (6 real photos) |
| 17 | p17_03_photo_detail.png | Photo detail viewer | DONE | 금돼지식당 (Geumdwaeji Sikdang), "September 21 · 1/6" |
| 17 | p17_04_photo_navigation.png | Next photo | DONE | Advanced to photo 2/6, both ‹ › nav arrows visible |
| 18 | p18_01_shareable_diary.png | Diary tab (share entry point) | DONE | Same screen as p17_01 — share icon clearly visible on every trip card |
| 18 | p18_02_share_action.png | Generated share card | DONE | **This is the actual PNG the app generates and hands to the OS share sheet** (fetched directly from `/api/diary-card/[tripId]`, not a mockup) — STARA-branded card, 3 real photos, real Korean place names, `#STARA #FollowYourStar #3Checkpoints` |
| 18 | p18_03_public_shared_page.png | — | **BLOCKED (D — FEATURE NOT IMPLEMENTED, by design)** | There is no public/shared webpage for diary content. A previous "collection book" public page (`/collection/[username]`) existed but was deliberately removed earlier this session because it had zero reachable entry points anywhere in the UI. The current diary-share feature (`DiaryShareButton`) only generates an image and hands it to `navigator.share()`/file download — it never creates a persistent, externally-visitable URL. Confirmed `/collection/*` returns 404. Screenshotting a "public page" would misrepresent the current architecture. |

## Taxonomy note (affects P9 and P16)

The task brief's "canonical" category list — `food / shopping / culture / activity /
landmark / kpop` — **is real, but it's the badge taxonomy, not the place-filter
taxonomy.** Confirmed directly in p16_03: all 6 of those exact categories exist as badge
sections. The `/edit` "Find places" filter chips (p09_01) use a *different*, related-but-
distinct taxonomy: `Food / Photo / Culture / Shopping / Experience`
(`PlaceCategory` in `src/types/index.ts`). A mapping function
(`badgeCategoryForPlaceCategory`) converts one into the other server-side for badge
counting, but the UI-facing filter never shows the badge-style names. This is not a bug —
just two intentionally different vocabularies for two different features — but P9's
screenshots reflect the real filter taxonomy (Food/Photo/Culture/Shopping/Experience), not
the brief's assumed one, per "do not silently reinterpret" instructions.

## Drafts

`_drafts/` contains rejected/earlier probe captures kept for reference (stale-state
retries, the bare region-picker map, mid-transition frames, the T-money bonus quest's
pre-loaded state, etc.) — none of these are meant for the PPT.
