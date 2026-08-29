# Graph Report - .  (2026-08-29)

## Corpus Check
- 161 files · ~70,790 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 783 nodes · 1341 edges · 77 communities (43 shown, 34 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.82)
- Token cost: 385,835 input · 0 output

## Community Hubs (Navigation)
- Route & Reels Core
- Dataset Build Pipeline
- Onboarding & UI Kit
- Tourism API Client
- Trip Shell & Gamification
- Collection & User Auth
- Runtime Dependencies
- Project Docs & Rationale
- Root TS Config
- Clerk Template TS Config
- Dev Dependencies
- Clerk Template Package.json
- Directions Providers
- Tmap Map Components
- Places Data Catalog
- Clerk Sign-Up & Setup
- Clerk Route Protection
- Place Extraction Script
- Schedule & Auto-Place Selector
- Clerk Invitations & Webhooks
- Clerk Org Roles & Permissions
- Clerk Backend API Skill
- Clerk Sign-In Flows
- Tourism Candidates Hook
- Clerk Show Component
- Clerk Middleware Strategies
- Tourism Ranking Signal
- Route Options Hook
- Data Preprocessing Template
- Tourism Nearby Config
- Tmap Global Types
- Root Layout & Fonts
- Seoul Main Route Data
- Clerk Caching & Auth Tags
- Clerk Enterprise SSO
- K-ROUTE Prototype Screens A
- Neon Branching Config
- App Proxy Middleware
- Agent Config Notes
- Clerk API Specs Script
- Clerk Execute Request Script
- Clerk Endpoint Detail Script
- Clerk Tag Endpoints Script
- Clerk Template Proxy Config
- Pipeline Verification Gate
- ESLint Config
- K-ROUTE Map & Card
- Next.js Config
- PostCSS Config
- Progress Notes Overview
- Neon Pooled vs Direct
- Neon Scale to Zero
- GBrain Configuration
- GBrain Search Guidance
- K-ROUTE BackBtn Component
- K-ROUTE City Confirm Screen
- K-ROUTE Diary Prompt Screen
- K-ROUTE Diary Screen
- K-ROUTE Mission Map Screen
- K-ROUTE Route Complete Screen
- K-ROUTE Route Confirm Screen
- K-ROUTE Route Generating Screen
- K-ROUTE Route Preview Screen
- K-ROUTE Shell Component
- K-ROUTE Sign-In Screen
- K-ROUTE Travel Start Screen
- File Icon Asset
- Globe Icon Asset
- Next.js Logo Asset
- Vercel Logo Asset
- Window Icon Asset

## God Nodes (most connected - your core abstractions)
1. `Place` - 40 edges
2. `getDb()` - 17 edges
3. `compilerOptions` - 16 edges
4. `main()` - 16 edges
5. `useTripPlan()` - 16 edges
6. `compilerOptions` - 16 edges
7. `Clerk Next.js Patterns Skill` - 16 edges
8. `Clerk Organizations Skill` - 16 edges
9. `getPlaceById()` - 15 edges
10. `canonical_artist()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `REGIONS Data Array` --semantically_similar_to--> `Place Data Schema (do not change)`  [INFERRED] [semantically similar]
  kroute.html → CLAUDE.md
- `MissionDetailSheet` --semantically_similar_to--> `MissionSheet (photo+quest+stamp unified flow)`  [AMBIGUOUS] [semantically similar]
  kroute.html → PROGRESS.md
- `ARTISTS Data Array` --semantically_similar_to--> `Place Data Schema (do not change)`  [INFERRED] [semantically similar]
  kroute.html → CLAUDE.md
- `MissionDetailSheet` --semantically_similar_to--> `Swappable Provider Interfaces (Tourism/Directions/Map/QuestVerification/CollectionBook)`  [INFERRED] [semantically similar]
  kroute.html → README.md
- `Swappable Provider Interfaces (Tourism/Directions/Map/QuestVerification/CollectionBook)` --semantically_similar_to--> `Preprocessed JSON → App Data Connection Point`  [INFERRED] [semantically similar]
  README.md → data-pipeline/CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Middleware Route Protection Pattern** — _agents_skills_clerk_nextjs_patterns_references_middleware_strategies_clerkmiddleware, _agents_skills_clerk_nextjs_patterns_references_middleware_strategies_public_first, _agents_skills_clerk_nextjs_patterns_references_middleware_strategies_protected_first, _agents_skills_clerk_nextjs_patterns_references_middleware_strategies_permission_gated, _agents_skills_clerk_webhooks_skill_public_route [INFERRED 0.85]
- **Metadata Type System and Replace-Not-Merge Gotcha** — _agents_skills_clerk_backend_api_skill_metadata_types, _agents_skills_clerk_backend_api_skill_metadata_overwrite, _agents_skills_clerk_orgs_skill_metadata_replace [INFERRED 0.85]
- **Core 2 to Core 3 Custom Auth Flow Migration** — _agents_skills_clerk_custom_ui_core_2_custom_sign_in_usesignin, _agents_skills_clerk_custom_ui_core_3_custom_sign_in_usesignin, _agents_skills_clerk_custom_ui_core_2_custom_sign_up_usesignup, _agents_skills_clerk_custom_ui_core_3_custom_sign_up_usesignup, _agents_skills_clerk_custom_ui_core_3_show_component_show, _agents_skills_clerk_custom_ui_core_3_show_component_signedin_protect [EXTRACTED 1.00]
- **K-ROUTE Shared Design-System Components** — kroute_pill, kroute_kbtn, kroute_kcard, kroute_bottomnav, kroute_shell [EXTRACTED 0.90]
- **K-ROUTE Bottom Tab Screens (Cover/Route/Stamps/Diary)** — kroute_bottomnav, kroute_homecoverscreen, kroute_mapscreen, kroute_stampsscreen, kroute_diaryscreen, kroute_missionmapscreen [EXTRACTED 0.90]
- **STARA Place Data Ingestion Flow (collect → verify → publish → app)** — data_pipeline_readme_build_dataset_pipeline, data_pipeline_readme_status_workflow, data_pipeline_claude_output_app_connection, claude_place_data_schema [INFERRED 0.80]

## Communities (77 total, 34 thin omitted)

### Community 0 - "Route & Reels Core"
Cohesion: 0.08
Nodes (44): findNearestPlace(), AuthNav(), FilterBar(), Props, PlaceDetailSheet(), Props, Props, ReelCard() (+36 more)

### Community 1 - "Dataset Build Pipeline"
Cohesion: 0.07
Nodes (60): _artist_key(), build_schema(), canonical_artist(), categorize(), categorize_kakao(), clean_listicle_title(), extract_mentioned_names(), filter_by_allowlist() (+52 more)

### Community 2 - "Onboarding & UI Kit"
Cohesion: 0.06
Nodes (36): LocalUser, AVATAR_COLORS, initialsOf(), OnboardingArtistsPage(), GenerateInner(), INCHEON_STYLE, REGION_LAYOUT, REGION_PILL_BG (+28 more)

### Community 3 - "Tourism API Client"
Cohesion: 0.07
Nodes (36): POST(), GET(), CacheEntry, cacheGet(), cacheSet(), store, buildUrl(), callTourApi() (+28 more)

### Community 4 - "Trip Shell & Gamification"
Cohesion: 0.07
Nodes (39): CompletePage(), EditPage(), Props, SubQuestList(), DiaryTab(), DiaryViewer(), groupByDay(), mergeSessionIntoGroups() (+31 more)

### Community 5 - "Collection & User Auth"
Cohesion: 0.14
Nodes (24): GET(), GET(), POST(), GET(), POST(), CollectionPage(), generateMetadata(), Props (+16 more)

### Community 6 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (30): drizzle-orm, heic2any, lucide-react, @neondatabase/serverless, dependencies, @clerk/nextjs, drizzle-orm, heic2any (+22 more)

### Community 7 - "Project Docs & Rationale"
Cohesion: 0.07
Nodes (29): Lakebase Postgres Overview, Neon Backend Primitives (Postgres/Auth/Storage/Functions/AI Gateway), Neon Platform Overview, Place Data Schema (do not change), data-pipeline Monorepo Merge via git subtree, Preprocessed JSON → App Data Connection Point, --owner= City Output Naming Convention, build_dataset.py Pipeline (load/normalize/merge/filter/geocode/save) (+21 more)

### Community 8 - "Root TS Config"
Cohesion: 0.07
Nodes (28): **/*.mts, .next/dev/types/**/*.ts, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx (+20 more)

### Community 9 - "Clerk Template TS Config"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 10 - "Dev Dependencies"
Cohesion: 0.09
Nodes (23): dotenv-cli, drizzle-kit, eslint, eslint-config-next, devDependencies, dotenv-cli, drizzle-kit, eslint (+15 more)

### Community 11 - "Clerk Template Package.json"
Cohesion: 0.09
Nodes (21): dependencies, @clerk/nextjs, next, react, react-dom, devDependencies, @types/react, @types/react-dom (+13 more)

### Community 12 - "Directions Providers"
Cohesion: 0.17
Nodes (13): POST(), computeRouteLegs(), RouteLeg, RouteLegsResult, RouteStop, haversineDirectionsProvider, parseTmapResponse(), tmapDirectionsProvider (+5 more)

### Community 13 - "Tmap Map Components"
Cohesion: 0.16
Nodes (11): MapErrorBoundary, Props, State, MapView(), TmapMapView, pinIconUrl(), SEOUL_CENTER, TmapMapView() (+3 more)

### Community 14 - "Places Data Catalog"
Cohesion: 0.12
Nodes (13): allDrafts, ARTIST_HUBS, artistPlaces, LOCAL_RESTAURANT_PLACES, LOCAL_TOURISM_PLACES, localRestaurantPlaces, localTourismPlaces, mainRoutePlaces (+5 more)

### Community 15 - "Clerk Sign-Up & Setup"
Cohesion: 0.15
Nodes (16): Custom Sign-Up Flow (Core 2), useSignUp() Hook (Core 2), Sign-Up Verification Flow (Core 2), Custom Sign-Up Flow (Current SDK), signUp.finalize() Session Activation, Transferable Sign-Up, useSignUp() Hook (Core 3), Clerk Custom UI Skill (+8 more)

### Community 16 - "Clerk Route Protection"
Cohesion: 0.16
Nodes (15): API Routes Reference, 401 vs 403 Auth Error Pattern, Org Route Protection Pattern, Server Actions Reference, Server Action Auth Protection Pattern, Permission Check (RBAC) in Server Actions, Clerk Next.js Patterns Skill, auth() Server Helper (+7 more)

### Community 17 - "Place Extraction Script"
Cohesion: 0.20
Nodes (14): classify_item(), extract_place_candidates(), extract_proper_nouns(), fetch_text(), main(), normalize_naver_blog_url(), process_urls(), URL 접속해서 본문으로 추정되는 텍스트를 최대한 뽑아냄. (+6 more)

### Community 18 - "Schedule & Auto-Place Selector"
Cohesion: 0.27
Nodes (10): SUB_QUEST_TEMPLATES, AutoSelectorCandidates, AutoSelectorResult, pickBestRestaurant(), buildSchedule(), isWithinWindow(), toHHMM(), toMinutes() (+2 more)

### Community 19 - "Clerk Invitations & Webhooks"
Cohesion: 0.20
Nodes (12): Organization Invitations Reference, Accept Invitation Custom Flow (ticket strategy), createOrganizationInvitationBulk(), createOrganizationInvitation(), Invitation Lifecycle Webhook Events, Framework-Specific Webhook Handlers Reference, Per-Framework verifyWebhook Adapters, Clerk Webhooks Skill (+4 more)

### Community 20 - "Clerk Org Roles & Permissions"
Cohesion: 0.24
Nodes (10): Roles and Permissions Reference, Billing Gates Permissions, Custom Roles / Role Sets, System Permissions Catalog (org:sys_*), Clerk Organizations Skill, choose-organization Session Task, clerk CLI Programmatic Org Management, Membership Mode (required vs optional) (+2 more)

### Community 21 - "Clerk Backend API Skill"
Cohesion: 0.22
Nodes (9): Clerk Backend API Skill, CLERK_BAPI_SCOPES Check, FAST PATH Common Operations, Metadata Overwrites Not Merges (User), Metadata Types (public/private/unsafe), Skill Modes (help/browse/execute/detail), Backend API Rate Limits, CLERK_SECRET_KEY Check (+1 more)

### Community 22 - "Clerk Sign-In Flows"
Cohesion: 0.31
Nodes (9): Custom Sign-In Flow (Core 2), MFA Second Factor Flow (Core 2), SSO/OAuth authenticateWithRedirect (Core 2), useSignIn() Hook (Core 2), Custom Sign-In Flow (Current SDK), Device Trust (needs_client_trust), signIn.finalize() Session Activation, MFA Second Factor Flow (Core 3) (+1 more)

### Community 23 - "Tourism Candidates Hook"
Cohesion: 0.31
Nodes (8): centroidOf(), EMPTY, fetchCandidates(), fetchNearbyPlaces(), Loaded, sessionCache, TourismCandidates, useTourismCandidates()

### Community 24 - "Clerk Show Component"
Cohesion: 0.38
Nodes (7): <Show> Component Doc, <Show> Component, <SignedIn>/<SignedOut>/<Protect> (Core 2 equivalents), Server vs Client Reference, Client Component Auth (useUser(), useAuth()), Hybrid Server/Client Auth Pattern, Server Component Auth (auth(), currentUser())

### Community 25 - "Clerk Middleware Strategies"
Cohesion: 0.33
Nodes (7): Middleware Strategies Reference, clerkMiddleware() / proxy.ts, Permission-Gated Routes, Protected-First Middleware Strategy, Public-First Middleware Strategy, Session Tasks (pending status) in Middleware, Token-Based Protection (Machine APIs)

### Community 26 - "Tourism Ranking Signal"
Cohesion: 0.33
Nodes (4): pickClosestCandidate(), CandidateScoreInput, RelatedTourismSignalProvider, scoreCandidate()

### Community 27 - "Route Options Hook"
Cohesion: 0.38
Nodes (6): fetchThemePlaces(), RouteOption, State, THEMES, toOption(), useRouteOptions()

### Community 28 - "Data Preprocessing Template"
Cohesion: 0.33
Nodes (5): Artist, City, Place, PlaceCategory, PlaceStatus

### Community 29 - "Tourism Nearby Config"
Cohesion: 0.40
Nodes (3): DINNER_WINDOW, LUNCH_WINDOW, TOUR_SEARCH_RADIUS_METERS

### Community 30 - "Tmap Global Types"
Cohesion: 0.33
Nodes (5): TmapClickEvent, TmapLatLngInstance, TmapMapInstance, TmapMarkerInstance, Window

### Community 31 - "Root Layout & Fonts"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 32 - "Seoul Main Route Data"
Cohesion: 0.40
Nodes (4): MAIN_ROUTE_PLACE_IDS, ROUTES, SEOUL_MAIN_ROUTE, StaraRoute

### Community 33 - "Clerk Caching & Auth Tags"
Cohesion: 0.67
Nodes (4): Caching with Auth Reference, Org-Scoped Cache, revalidateTag After Mutation, User-Scoped Cache Key Requirement

### Community 34 - "Clerk Enterprise SSO"
Cohesion: 0.83
Nodes (4): Enterprise SSO Reference, Enterprise SSO (SAML/OIDC per-org), JIT Provisioning, Verified Domains (mutually exclusive with SSO)

### Community 35 - "K-ROUTE Prototype Screens A"
Cohesion: 0.50
Nodes (4): BottomNav Component, HomeCoverScreen, STAMP_CARDS Data Array, StampsScreen

### Community 36 - "Neon Branching Config"
Cohesion: 0.67
Nodes (3): Neon Branching (Postgres), Branch-First Dev Flow, neon.ts Infrastructure-as-Code Config

## Ambiguous Edges - Review These
- `MissionSheet (photo+quest+stamp unified flow)` → `MissionDetailSheet`  [AMBIGUOUS]
  kroute.html · relation: semantically_similar_to

## Knowledge Gaps
- **244 isolated node(s):** `api-specs-context.sh script`, `execute-request.sh script`, `extract-endpoint-detail.sh script`, `extract-tag-endpoints.sh script`, `name` (+239 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `MissionSheet (photo+quest+stamp unified flow)` and `MissionDetailSheet`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `Place` connect `Route & Reels Core` to `Onboarding & UI Kit`, `Tourism API Client`, `Trip Shell & Gamification`, `Places Data Catalog`, `Schedule & Auto-Place Selector`, `Tourism Candidates Hook`, `Route Options Hook`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `getPlaceById()` connect `Trip Shell & Gamification` to `Route & Reels Core`, `Schedule & Auto-Place Selector`, `Collection & User Auth`, `Places Data Catalog`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `api-specs-context.sh script`, `execute-request.sh script`, `extract-endpoint-detail.sh script` to the rest of the system?**
  _244 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Route & Reels Core` be split into smaller, more focused modules?**
  _Cohesion score 0.0764423076923077 - nodes in this community are weakly interconnected._
- **Should `Dataset Build Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.06656426011264721 - nodes in this community are weakly interconnected._
- **Should `Onboarding & UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.05737704918032787 - nodes in this community are weakly interconnected._