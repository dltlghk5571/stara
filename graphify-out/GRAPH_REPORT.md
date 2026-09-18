# Graph Report - .  (2026-09-15)

## Corpus Check
- 199 files · ~130,494 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 992 nodes · 1937 edges · 111 communities (56 shown, 55 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.78)
- Token cost: 241,727 input · 0 output

## Community Hubs (Navigation)
- Onboarding Flow Screens
- App Routes & Layout
- KTO Place Matching
- Dataset Build Pipeline
- TypeScript Config (Dev)
- TypeScript Config
- Core Package Dependencies
- Auto Place Selection & Scheduling
- Naver Hub Source Verification
- Route Legs Computation
- Map View Rendering
- Frontend Dependencies
- Trip Shell & Store
- Dev Tooling Dependencies
- Tourism Candidates Hook
- Clerk Sign-Up Flows
- Seoul Dataset Export
- Route Options Hook
- Seoul Places & Routes Data
- Clerk Auth Patterns (Next.js)
- Blog Place Extraction
- Opening Hours Enrichment
- Distance & Route Insertion
- Dummy Place Data
- Clerk Org Invitations & Webhooks
- Seoul Dataset Validation
- Clerk Roles & Permissions
- STARA API Integrations
- Quest & Mission UI
- Package Scripts
- Clerk Backend API Skill
- Clerk Sign-In Flows
- Route Directions Hook
- Place Data Schema
- Data Verification Pipeline
- Clerk Auth Components
- Clerk Middleware Strategies
- Hardcoded String Test
- STARA Project Docs
- Data Preprocessing Types
- Source Credibility & i18n Gates
- Tmap Type Definitions
- Local Storage Helpers
- Clerk Caching With Auth
- Clerk Enterprise SSO
- Home & Stamps Screens
- Trip Planning Libraries
- Schedule Footer Component
- Neon Branching
- Neon Platform Overview
- Data Schema & Place ID
- Locale Provider & i18n Goals
- Auth Middleware Config
- Repo Meta Docs
- API Specs Context Script
- Execute Request Script
- Extract Endpoint Detail Script
- Extract Tag Endpoints Script
- Proxy Config
- Bilingual Name Skills
- Cross-City Review Files
- File Naming Conventions
- Accommodation Filter Rule
- Artist Alias Canonicalization
- Geolocation & Mission Radius
- i18n Plan & Design Spec
- Dictionary & Localize Helpers
- Locale Toggle & Hooks
- Drizzle Kit Dependency
- ESLint Config
- Map & Card Components
- T-money Logo & Brand
- Next.js Config
- Vercel Blob Dependency
- Tailwind PostCSS Dependency
- TypeScript Dependency
- PostCSS Config
- HEIC & Satori Bug Fixes
- Distance & Route Optimizer
- Neon Connection Strings
- Neon Scale To Zero
- GBrain Configuration
- GBrain Search Guidance
- Structural Scan Checklist
- Place Category Taxonomy
- Blog Extraction Standby Tool
- TourAPI Operations
- Back Button Component
- City Confirm Screen
- Diary Prompt Screen
- Diary Screen
- Mission Map Screen
- Route Complete Screen
- Route Confirm Screen
- Route Generating Screen
- Route Preview Screen
- Shell Component
- Sign-In Screen
- Travel Start Screen
- Known Issues Log
- File Icon Asset
- Globe Icon Asset
- Next.js Logo Asset
- Vercel Logo Asset
- Browser Window Icon

## God Nodes (most connected - your core abstractions)
1. `useT()` - 52 edges
2. `useLocale()` - 45 edges
3. `Place` - 43 edges
4. `placeName()` - 26 edges
5. `Locale` - 25 edges
6. `translate()` - 19 edges
7. `main()` - 17 edges
8. `getDb()` - 17 edges
9. `getDictionary()` - 17 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `MissionDetailSheet` --semantically_similar_to--> `MissionSheet component — unified photo-upload + quest-complete + stamp flow`  [AMBIGUOUS] [semantically similar]
  kroute.html → PROGRESS.md
- `ARTISTS Data Array` --semantically_similar_to--> `Place Data Schema (do not change)`  [INFERRED] [semantically similar]
  kroute.html → CLAUDE.md
- `REGIONS Data Array` --semantically_similar_to--> `Place Data Schema (do not change)`  [INFERRED] [semantically similar]
  kroute.html → CLAUDE.md
- `Dummy-to-real data replacement guide (rationale: artists.ts/places.ts/quests.ts field rules so app swaps to real data without new API routes)` --semantically_similar_to--> `Data_Preprocessing_Template.ts — final cities/artists/places schema`  [INFERRED] [semantically similar]
  README.md → data-pipeline/README.md
- `has_credible_citation() heuristic (person+specific-content citation detector)` --semantically_similar_to--> `src/i18n/no-hardcoded-strings.test.ts — regex gate for leftover Korean in src/**/*.tsx`  [INFERRED] [semantically similar]
  data-pipeline/README.md → docs/superpowers/plans/2026-09-07-i18n-en-ko.md

## Import Cycles
- 3-file cycle: `src/i18n/index.ts -> src/i18n/localize.ts -> src/lib/tour-api/useRouteOptions.ts -> src/i18n/index.ts`

## Hyperedges (group relationships)
- **Metadata Type System and Replace-Not-Merge Gotcha** — _agents_skills_clerk_backend_api_skill_metadata_types, _agents_skills_clerk_backend_api_skill_metadata_overwrite, _agents_skills_clerk_orgs_skill_metadata_replace [INFERRED 0.85]
- **Core 2 to Core 3 Custom Auth Flow Migration** — _agents_skills_clerk_custom_ui_core_2_custom_sign_in_usesignin, _agents_skills_clerk_custom_ui_core_3_custom_sign_in_usesignin, _agents_skills_clerk_custom_ui_core_2_custom_sign_up_usesignup, _agents_skills_clerk_custom_ui_core_3_custom_sign_up_usesignup, _agents_skills_clerk_custom_ui_core_3_show_component_show, _agents_skills_clerk_custom_ui_core_3_show_component_signedin_protect [EXTRACTED 1.00]
- **Middleware Route Protection Pattern** — _agents_skills_clerk_nextjs_patterns_references_middleware_strategies_clerkmiddleware, _agents_skills_clerk_nextjs_patterns_references_middleware_strategies_public_first, _agents_skills_clerk_nextjs_patterns_references_middleware_strategies_protected_first, _agents_skills_clerk_nextjs_patterns_references_middleware_strategies_permission_gated, _agents_skills_clerk_webhooks_skill_public_route [INFERRED 0.85]
- **K-ROUTE Shared Design-System Components** — kroute_pill, kroute_kbtn, kroute_kcard, kroute_bottomnav, kroute_shell [EXTRACTED 0.90]
- **K-ROUTE Bottom Tab Screens (Cover/Route/Stamps/Diary)** — kroute_bottomnav, kroute_homecoverscreen, kroute_mapscreen, kroute_stampsscreen, kroute_diaryscreen, kroute_missionmapscreen [EXTRACTED 0.90]
- **STARA Data Collection Pipeline Stages** — data_pipeline_readme_build_dataset, data_pipeline_readme_fill_hours, data_pipeline_readme_naver_hub, data_pipeline_readme_extract_places [INFERRED 0.85]
- **STARA Place-Data Review Skill Suite** — data_pipeline__claude_skills_fill_bilingual_place_names_skill_document, data_pipeline__claude_skills_stara_place_review_skill_document, data_pipeline__claude_skills_verify_english_query_matches_skill_document [EXTRACTED 1.00]
- **i18n Coverage-Gate Safety Net** — docs_superpowers_plans_2026_09_07_i18n_en_ko_dictionary_parity_test, docs_superpowers_plans_2026_09_07_i18n_en_ko_no_hardcoded_strings_test, docs_superpowers_plans_2026_09_07_i18n_en_ko_localize_helpers [INFERRED 0.75]

## Communities (111 total, 55 thin omitted)

### Community 0 - "Onboarding Flow Screens"
Cohesion: 0.06
Nodes (84): AVATAR_COLORS, initialsOf(), OnboardingArtistsPage(), GenerateInner(), projX(), projY(), REGION_PILL_BG, REGION_POS (+76 more)

### Community 1 - "App Routes & Layout"
Cohesion: 0.06
Nodes (57): GET(), GET(), POST(), GET(), POST(), LocalUser, MyCollectionPage(), CollectionPage() (+49 more)

### Community 2 - "KTO Place Matching"
Cohesion: 0.06
Nodes (51): Candidate, main(), matchPlace(), namesLikelyMatch(), normalize(), pickConfidentMatch(), PipelinePlace, readJson() (+43 more)

### Community 3 - "Dataset Build Pipeline"
Cohesion: 0.06
Nodes (66): _artist_key(), artist_mentioned_in_text(), build_schema(), canonical_artist(), categorize(), categorize_kakao(), clean_listicle_title(), extract_mentioned_names() (+58 more)

### Community 4 - "TypeScript Config (Dev)"
Cohesion: 0.07
Nodes (28): **/*.mts, .next/dev/types/**/*.ts, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx (+20 more)

### Community 5 - "TypeScript Config"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 6 - "Core Package Dependencies"
Cohesion: 0.09
Nodes (21): dependencies, @clerk/nextjs, next, react, react-dom, devDependencies, @types/react, @types/react-dom (+13 more)

### Community 7 - "Auto Place Selection & Scheduling"
Cohesion: 0.17
Nodes (13): AutoSelectorResult, pickBestRestaurant(), pickClosestCandidate(), buildSchedule(), formatTime(), isWithinWindow(), toHHMM(), toMinutes() (+5 more)

### Community 8 - "Naver Hub Source Verification"
Cohesion: 0.19
Nodes (19): fill_sources(), find_source_url(), _headers(), load_artist_ko_names(), load_env(), main(), _mapxy_to_wgs84(), naver_local_recheck() (+11 more)

### Community 9 - "Route Legs Computation"
Cohesion: 0.17
Nodes (13): POST(), computeRouteLegs(), RouteLeg, RouteLegsResult, RouteStop, haversineDirectionsProvider, parseTmapResponse(), tmapDirectionsProvider (+5 more)

### Community 10 - "Map View Rendering"
Cohesion: 0.14
Nodes (14): MapErrorBoundary, MapErrorFallback(), Props, State, MapLoading(), MapView(), TmapMapView, pinIconUrl() (+6 more)

### Community 11 - "Frontend Dependencies"
Cohesion: 0.11
Nodes (19): drizzle-orm, heic2any, lucide-react, @neondatabase/serverless, dependencies, @clerk/nextjs, drizzle-orm, heic2any (+11 more)

### Community 12 - "Trip Shell & Store"
Cohesion: 0.25
Nodes (13): CompletePage(), EditPage(), AuthNav(), mergeSessionIntoGroups(), TripShellClient(), getPlaceById(), buildFinalOrder(), initialState (+5 more)

### Community 13 - "Dev Tooling Dependencies"
Cohesion: 0.12
Nodes (17): dotenv-cli, eslint, eslint-config-next, devDependencies, dotenv-cli, eslint, eslint-config-next, tailwindcss (+9 more)

### Community 14 - "Tourism Candidates Hook"
Cohesion: 0.15
Nodes (16): Props, Props, Props, Props, AutoSelectorCandidates, centroidOf(), EMPTY, fetchCandidates() (+8 more)

### Community 15 - "Clerk Sign-Up Flows"
Cohesion: 0.15
Nodes (16): Custom Sign-Up Flow (Core 2), useSignUp() Hook (Core 2), Sign-Up Verification Flow (Core 2), Custom Sign-Up Flow (Current SDK), signUp.finalize() Session Activation, Transferable Sign-Up, useSignUp() Hook (Core 3), Clerk Custom UI Skill (+8 more)

### Community 16 - "Seoul Dataset Export"
Cohesion: 0.14
Nodes (12): artists, DWELL_FALLBACK_BY_PIPELINE_CATEGORY, PipelineArtist, PipelinePlace, places, seoulArtistIds, seoulArtists, seoulPlaces (+4 more)

### Community 17 - "Route Options Hook"
Cohesion: 0.17
Nodes (12): DINNER_WINDOW, LUNCH_WINDOW, TOUR_SEARCH_RADIUS_METERS, TRAVEL_CONFIG, ARTIST_PLACES, dedupeById(), fetchThemePlaces(), RouteOption (+4 more)

### Community 18 - "Seoul Places & Routes Data"
Cohesion: 0.14
Nodes (13): SEOUL_PLACES, SeoulPlaceDraft, allDrafts, LOCAL_TOURISM_PLACES, localRestaurantPlaces, localTourismPlaces, MAIN_ROUTE_PLACE_IDS, mainRoutePlaces (+5 more)

### Community 19 - "Clerk Auth Patterns (Next.js)"
Cohesion: 0.16
Nodes (15): API Routes Reference, 401 vs 403 Auth Error Pattern, Org Route Protection Pattern, Server Actions Reference, Server Action Auth Protection Pattern, Permission Check (RBAC) in Server Actions, Clerk Next.js Patterns Skill, auth() Server Helper (+7 more)

### Community 20 - "Blog Place Extraction"
Cohesion: 0.20
Nodes (14): classify_item(), extract_place_candidates(), extract_proper_nouns(), fetch_text(), main(), normalize_naver_blog_url(), process_urls(), URL 접속해서 본문으로 추정되는 텍스트를 최대한 뽑아냄. (+6 more)

### Community 21 - "Opening Hours Enrichment"
Cohesion: 0.25
Nodes (14): cache_path_for(), extract_weekday_hours(), haversine_m(), load_cached(), load_env(), looks_always_open(), main(), process_place() (+6 more)

### Community 22 - "Distance & Route Insertion"
Cohesion: 0.29
Nodes (10): findNearestPlace(), ReelsPanel(), estimateTravelMinutes(), haversineKm(), toRad(), travelMinutesBetween(), estimateAddedMinutes(), findBestInsertion() (+2 more)

### Community 23 - "Dummy Place Data"
Cohesion: 0.18
Nodes (9): ARTIST_HUBS, artistPlaces, DUMMY_ARTIST_PLACES, PlaceDraft, sharedPlace, THIRD_CATEGORY, LOCAL_RESTAURANT_PLACES, dummy() (+1 more)

### Community 24 - "Clerk Org Invitations & Webhooks"
Cohesion: 0.20
Nodes (12): Organization Invitations Reference, Accept Invitation Custom Flow (ticket strategy), createOrganizationInvitationBulk(), createOrganizationInvitation(), Invitation Lifecycle Webhook Events, Framework-Specific Webhook Handlers Reference, Per-Framework verifyWebhook Adapters, Clerk Webhooks Skill (+4 more)

### Community 25 - "Seoul Dataset Validation"
Cohesion: 0.18
Nodes (9): artistIdSet, artists, errors, idCounts, KNOWN_CATEGORIES, PipelineArtist, PipelinePlace, places (+1 more)

### Community 26 - "Clerk Roles & Permissions"
Cohesion: 0.24
Nodes (10): Roles and Permissions Reference, Billing Gates Permissions, Custom Roles / Role Sets, System Permissions Catalog (org:sys_*), Clerk Organizations Skill, choose-organization Session Task, clerk CLI Programmatic Org Management, Membership Mode (required vs optional) (+2 more)

### Community 27 - "STARA API Integrations"
Cohesion: 0.20
Nodes (10): src/proxy.ts — Clerk auth middleware redirecting unauthenticated access to /sign-in, STARA 사용 API 목록 (Used API List), Clerk authentication (dev keys, production transition pending), Neon Postgres + Drizzle ORM (users, quest_photos tables), Vercel Blob storage (client-direct photo upload), DirectionsProvider interface (rationale: Haversine default, TMap overrides per-segment when key present), src/lib/tour-api/relatedTourism.ts — TarRlteTarService1 ranking signal, TMap JS SDK (map rendering, replaced Leaflet/OSM) (+2 more)

### Community 28 - "Quest & Mission UI"
Cohesion: 0.20
Nodes (10): STARA 위치정보 처리 설명자료 (Location Data Handling Explainer), KBtn Component, LoadingScreen, MissionDetailSheet, MissionSuccessOverlay, Pill Component, MissionSheet component — unified photo-upload + quest-complete + stamp flow, quest_photos DB table (trip_id/trip_name, place_name snapshot columns added via drizzle-kit push) (+2 more)

### Community 29 - "Package Scripts"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, start, test (+1 more)

### Community 30 - "Clerk Backend API Skill"
Cohesion: 0.22
Nodes (9): Clerk Backend API Skill, CLERK_BAPI_SCOPES Check, FAST PATH Common Operations, Metadata Overwrites Not Merges (User), Metadata Types (public/private/unsafe), Skill Modes (help/browse/execute/detail), Backend API Rate Limits, CLERK_SECRET_KEY Check (+1 more)

### Community 31 - "Clerk Sign-In Flows"
Cohesion: 0.31
Nodes (9): Custom Sign-In Flow (Core 2), MFA Second Factor Flow (Core 2), SSO/OAuth authenticateWithRedirect (Core 2), useSignIn() Hook (Core 2), Custom Sign-In Flow (Current SDK), Device Trust (needs_client_trust), signIn.finalize() Session Activation, MFA Second Factor Flow (Core 3) (+1 more)

### Community 32 - "Route Directions Hook"
Cohesion: 0.28
Nodes (8): EMPTY, fetchDirections(), Loaded, RouteDirectionsResult, RouteLeg, sessionCache, stopsKeyOf(), useRouteDirections()

### Community 33 - "Place Data Schema"
Cohesion: 0.25
Nodes (8): Place Data Schema (do not change), ARTISTS Data Array, ArtistSelectScreen, getMissions() Function, MapScreen, RegionDetailScreen, REGIONS Data Array, STARA Serena Project Config

### Community 34 - "Data Verification Pipeline"
Cohesion: 0.29
Nodes (8): TourAPI-EN → WebSearch → Revised Romanization priority order (rationale: prevents guessed-romanization errors that repeatedly plagued this project), Full-rerun-wipes-manual-edits pitfall (rationale: build_dataset.py rerun reassembles from source and silently drops hand-filled relation_text_ko/review notes not stored in raw data), 3-step coordinate verification procedure (Korean-name recovery+recheck → contextual cross-check → unresolved_insufficient_evidence), build_dataset.py — raw source → cleaned/filtered/geocoded schema, dropped_no_city.csv — tracks rows where city assignment failed, fill_hours.py — Google Places (New) opening-hours enrichment, naver_hub.py — NAVER API HUB source_url fill + coordinate cross-check, NOISE_CATEGORIES filter (auto-excludes hospital/dental/realty/bank matches)

### Community 35 - "Clerk Auth Components"
Cohesion: 0.38
Nodes (7): <Show> Component Doc, <Show> Component, <SignedIn>/<SignedOut>/<Protect> (Core 2 equivalents), Server vs Client Reference, Client Component Auth (useUser(), useAuth()), Hybrid Server/Client Auth Pattern, Server Component Auth (auth(), currentUser())

### Community 36 - "Clerk Middleware Strategies"
Cohesion: 0.33
Nodes (7): Middleware Strategies Reference, clerkMiddleware() / proxy.ts, Permission-Gated Routes, Protected-First Middleware Strategy, Public-First Middleware Strategy, Session Tasks (pending status) in Middleware, Token-Based Protection (Machine APIs)

### Community 37 - "Hardcoded String Test"
Cohesion: 0.29
Nodes (3): ALLOW, ALLOWED_ENGLISH, ROOT

### Community 38 - "STARA Project Docs"
Cohesion: 0.33
Nodes (6): stara-place-review skill, data-pipeline CLAUDE.md, data-pipeline README, STARA 진행 기록 (Progress Log), STARA README, STARA — K-pop pilgrimage travel app (rationale: mobile-first web prototype, Seoul-only MVP scope)

### Community 39 - "Data Preprocessing Types"
Cohesion: 0.33
Nodes (5): Artist, City, Place, PlaceCategory, PlaceStatus

### Community 40 - "Source Credibility & i18n Gates"
Cohesion: 0.33
Nodes (6): CREDIBLE_CONTENT_MARKERS / CREDIBLE_CONTENT_WORD_MARKERS keyword lists, has_credible_citation() heuristic (person+specific-content citation detector), Source-URL verification gate (rationale: link OR traceable person+content citation required; status stays draft regardless), draft → verified → published status workflow, src/i18n/dictionary-parity.test.ts — asserts ko/en dictionaries share identical key paths, src/i18n/no-hardcoded-strings.test.ts — regex gate for leftover Korean in src/**/*.tsx

### Community 41 - "Tmap Type Definitions"
Cohesion: 0.33
Nodes (5): TmapClickEvent, TmapLatLngInstance, TmapMapInstance, TmapMarkerInstance, Window

### Community 43 - "Clerk Caching With Auth"
Cohesion: 0.67
Nodes (4): Caching with Auth Reference, Org-Scoped Cache, revalidateTag After Mutation, User-Scoped Cache Key Requirement

### Community 44 - "Clerk Enterprise SSO"
Cohesion: 0.83
Nodes (4): Enterprise SSO Reference, Enterprise SSO (SAML/OIDC per-org), JIT Provisioning, Verified Domains (mutually exclusive with SSO)

### Community 45 - "Home & Stamps Screens"
Cohesion: 0.50
Nodes (4): BottomNav Component, HomeCoverScreen, STAMP_CARDS Data Array, StampsScreen

### Community 46 - "Trip Planning Libraries"
Cohesion: 0.50
Nodes (4): MAIN_ROUTE_PLACE_IDS hardcoded constant (later parameterized via tripStore.mainRoutePlaces), lib/autoPlaceSelector.ts — auto local-spot/restaurant supplementer, lib/scheduleCalculator.ts — arrival/departure schedule calculator, store/useTripPlan.ts — derived trip-plan recomputation hook

### Community 47 - "Schedule Footer Component"
Cohesion: 0.83
Nodes (3): Props, RemovalSuggestion, ScheduleResult

### Community 48 - "Neon Branching"
Cohesion: 0.67
Nodes (3): Neon Branching (Postgres), Branch-First Dev Flow, neon.ts Infrastructure-as-Code Config

### Community 49 - "Neon Platform Overview"
Cohesion: 0.67
Nodes (3): Lakebase Postgres Overview, Neon Backend Primitives (Postgres/Auth/Storage/Functions/AI Gateway), Neon Platform Overview

### Community 50 - "Data Schema & Place ID"
Cohesion: 1.00
Nodes (3): Data_Preprocessing_Template.ts — final cities/artists/places schema, place_id slug convention {artist_id}-{category}-{romanized-slug}, Dummy-to-real data replacement guide (rationale: artists.ts/places.ts/quests.ts field rules so app swaps to real data without new API routes)

## Ambiguous Edges - Review These
- `MissionDetailSheet` → `MissionSheet component — unified photo-upload + quest-complete + stamp flow`  [AMBIGUOUS]
  kroute.html · relation: semantically_similar_to

## Knowledge Gaps
- **309 isolated node(s):** `api-specs-context.sh script`, `execute-request.sh script`, `extract-endpoint-detail.sh script`, `extract-tag-endpoints.sh script`, `name` (+304 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `MissionDetailSheet` and `MissionSheet component — unified photo-upload + quest-complete + stamp flow`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `Place` connect `Tourism Candidates Hook` to `Onboarding Flow Screens`, `Route Directions Hook`, `KTO Place Matching`, `Auto Place Selection & Scheduling`, `Trip Shell & Store`, `Schedule Footer Component`, `Route Options Hook`, `Seoul Places & Routes Data`, `Distance & Route Insertion`, `Dummy Place Data`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `Locale` connect `KTO Place Matching` to `Onboarding Flow Screens`, `App Routes & Layout`, `Auto Place Selection & Scheduling`, `Trip Shell & Store`, `Tourism Candidates Hook`, `Route Options Hook`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `useT()` connect `Onboarding Flow Screens` to `App Routes & Layout`, `Map View Rendering`, `Trip Shell & Store`, `Schedule Footer Component`, `Distance & Route Insertion`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `api-specs-context.sh script`, `execute-request.sh script`, `extract-endpoint-detail.sh script` to the rest of the system?**
  _309 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Onboarding Flow Screens` be split into smaller, more focused modules?**
  _Cohesion score 0.0567139282735613 - nodes in this community are weakly interconnected._
- **Should `App Routes & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.05765271105010295 - nodes in this community are weakly interconnected._