# Codex Project Overview: Umami

## Executive summary

This repository contains Umami, a self-hostable, privacy-focused web analytics platform and an
alternative to Google Analytics. It is a full-stack TypeScript/JavaScript application built on
Next.js 16 and React 19. The same application serves the analytics dashboard, its JSON API, the
browser tracking and session-recording scripts, public share pages, redirect links, and tracking
pixels.

The default deployment stores both application metadata and analytics events in PostgreSQL through
Prisma. Larger installations can move high-volume event, replay, heatmap, and aggregate workloads to
ClickHouse, optionally sending ingestion messages through Kafka. Redis is optional and supports
caching and server-side authentication sessions. The repository also includes database migrations,
Docker and Podman deployment assets, unit tests, Playwright end-to-end tests, and a separately
buildable React component package.

## Project identity

| Item | Value |
| --- | --- |
| Package | `umami` |
| Version | `3.2.0` |
| Purpose | Privacy-focused website and product analytics |
| License | MIT |
| Package manager | pnpm, with lockfile and workspace configuration committed |
| Module format | ECMAScript modules (`"type": "module"`) |
| Web framework | Next.js `16.2.6`, using the App Router |
| UI runtime | React and React DOM `19.2.7` |
| Default database | PostgreSQL through Prisma `7.8.0` |
| Optional data services | ClickHouse, Kafka, and Redis |
| Unit/component tests | Vitest, jsdom, Testing Library, and MSW |
| End-to-end tests | Playwright, targeting desktop Chromium |
| Formatting/linting | Biome |

The root `README.md` describes the normal source installation: Node.js 18.18 or newer, PostgreSQL
12.14 or newer, `pnpm install`, a `DATABASE_URL`, `pnpm build`, and `pnpm start`. The current CI and
Docker definitions use Node.js 22, so Node 22 is the closest match to the maintained build
environment.

## Top-level directory map

The Git-tracked top-level directories are:

| Directory | Responsibility |
| --- | --- |
| `.github/` | GitHub issue templates and build/release/stale-issue workflows. |
| `.niteshift/` | Niteshift development-environment and preview configuration. |
| `db/` | Alternative database assets: the ClickHouse schema and migrations plus PostgreSQL data migrations. |
| `docker/` | Docker-specific runtime support, currently including the server proxy entry used in the image build. |
| `podman/` | Podman Compose, systemd user-service, sample environment, and installation documentation. |
| `prisma/` | The canonical PostgreSQL data model and ordered Prisma migrations. |
| `public/` | Static icons, maps, localized message/country/language data, and generated tracker bundles. |
| `scripts/` | Build, database, seed, telemetry, localization, geo-data, and maintenance scripts. |
| `src/` | The application, APIs, components, tracker/recorder sources, data access, permissions, state, and tests. |
| `tests/` | Playwright end-to-end fixtures, helpers, UI flows, and API scenarios. |

This working copy also contains local or generated directories that are not part of the committed
product source: `.git/`, `.agents/`, `.codex/`, `.next/`, `generated/`, `geo/`, and `node_modules/`.
The ignore rules also reserve `build/`, `dist/`, `coverage/`, `playwright-report/`, and `test-results/`
for generated output.

## Architecture at a glance

The major runtime path is:

1. A customer site loads the Rollup-built `public/script.js` tracker.
2. The tracker collects page views, custom events, identity data, and optional web-performance
   metrics, then posts them to `/api/send`.
3. The collection route validates and normalizes the request, filters bots and blocked IPs, derives
   privacy-preserving session/visit identifiers, and writes through `src/queries/sql/`.
4. `src/lib/db.ts` selects the PostgreSQL/Prisma or ClickHouse implementation at runtime. When
   ClickHouse is enabled, ingestion can write directly or publish to Kafka.
5. Authenticated Next.js pages call API route handlers under `src/app/api/`. Those handlers validate
   requests, enforce entity permissions, and invoke Prisma metadata queries or analytics SQL queries.
6. React Query manages remote dashboard data, Zustand stores global/client preferences, Chart.js and
   reusable components render analytics, and `next-intl` supplies localized messages.

This design keeps one repository and one Next.js deployment while retaining separate concerns for
collection, metadata operations, analytics queries, authorization, and presentation.

## Product surface

The App Router tree in `src/app/` exposes several distinct areas.

### Analytics and management UI

The authenticated `(main)` route group contains:

- A customizable dashboard and dashboard editor.
- Website management, website settings, and the core website overview.
- Page-view and event exploration, realtime activity, sessions, cohorts, comparisons, and segments.
- Session replay browsing and replay detail views.
- Dedicated reports for attribution, breakdowns, funnels, goals, heatmaps, journeys, performance,
  retention, revenue, and UTM campaigns.
- User and team administration with role-aware membership and website ownership.
- Boards, which combine configurable analytics components into saved views.
- Tracked links and pixels, each with management, analytics, and sharing support.
- User profile, language, theme, timezone, date-range, and other preference settings.

The root page redirects to the last-used team's websites when that preference is available, or to
the user's website list otherwise. Login, logout, and SSO routes sit outside the authenticated route
group. Admin routes provide cross-account views for users, teams, and websites.

### Sharing and collection routes

Public share pages live under `/share/[slug]` and use share-specific state and authorization context.
The `(collect)` route group exposes compact pixel and short-link routes. The API includes collection,
batch, recording, heartbeat, configuration, authentication, sharing, and resource-specific handlers.

There are route families for users, teams, websites, reports, boards, links, pixels, sessions,
replays, event/session property data, revenue, and realtime data. Most resource handlers follow a
REST-like convention with collection routes plus `[id]` routes for individual entities.

## Frontend organization

The global layout in `src/app/layout.tsx` sets fonts, favicons, metadata, robots behavior, and theme
colors. It can suppress the entire UI with `DISABLE_UI`, allowing a collection-only deployment.
`src/app/Providers.tsx` composes the main client providers:

- `ZenProvider` and `RouterProvider` from `@umami/react-zen` for the design system and navigation.
- `NextIntlClientProvider` for runtime language messages and document direction/language updates.
- `QueryClientProvider` for server-state fetching and mutations.
- A top-level application error boundary.

`src/components/` is organized by role: charts, shared UI, hooks, form/input controls, metric
visualizations, property-data views, sharing controls, and generated SVG components. Feature-specific
components generally live beside their pages inside `src/app/(main)/`.

State is deliberately split:

- React Query handles API-backed server state with one-minute default staleness, no automatic
  retries, and no focus refetching.
- Zustand stores under `src/store/` hold global application context, website/dashboard preferences,
  cache state, and version information.
- Local storage persists user-facing settings such as locale, theme, timezone, date range, dashboard
  layout, and the last selected team.

The UI uses Chart.js for charts, `react-simple-maps` for geographical displays, Motion for
animation, and a mixture of Umami's React Zen components and local CSS modules/global CSS.

## API, validation, and request handling

Next.js route handlers under `src/app/api/` form the server API. Common behavior is centralized:

- `src/lib/request.ts` parses URLs and JSON bodies, validates inputs with Zod, authenticates by
  default, extracts analytics filters, constrains date ranges, and expands saved segment/cohort
  definitions.
- `src/lib/response.ts` produces consistent JSON success and error bodies for 400, 401, 403, 404,
  413, and 500 responses.
- `src/lib/schema.ts` supplies reusable input schemas.
- `src/permissions/` contains resource-specific authorization checks for users, teams, websites,
  reports, boards, shares, links, pixels, and generic entities.
- `src/queries/prisma/` contains metadata CRUD and relationship queries.
- `src/queries/sql/` contains analytics reads and writes, often with parallel PostgreSQL and
  ClickHouse implementations selected by `runQuery`.

Analytics endpoints support date bucketing, pagination, search, sorting, comparison ranges, bounce
exclusion, property filters, saved segments, and cohort filters. The SQL abstraction contains shared
filter-building logic for both Prisma's PostgreSQL raw-query path and ClickHouse.

## Tracking and ingestion

### Browser tracker

`src/tracker/index.js` is a dependency-light browser script compiled and minified by Rollup into
`public/script.js`. Script element attributes control its behavior, including website ID, host URL,
auto-tracking, automatic page views, domain allowlists, Do Not Track handling, query/hash exclusion,
custom tags, performance collection, and a before-send callback.

The tracker:

- Records the initial view and hooks History API changes for single-page applications.
- Tracks declarative custom events from `data-umami-event` attributes and their associated data.
- Exposes `window.umami.track`, `window.umami.identify`, and session-cache access.
- Honors local opt-out, configured domains, and optional browser Do Not Track signals.
- Can collect TTFB, FCP, LCP, CLS, and INP using browser performance observers.
- Reuses a signed cache token returned by the server to reduce repeated session/website lookup work.

Rollup replaces the collection host and endpoint at build time. Next.js can also rename or remotely
serve the tracker, rewrite a custom collection endpoint, and apply permissive CORS plus cache headers
to tracker and collection routes.

### Collection API

`POST /api/send` accepts `event`, `identify`, and `performance` messages. It uses Zod to constrain the
payload and ensures exactly one website, tracked link, or pixel is the event source. The route:

- Rejects invalid data and spreadsheet-formula-like event names/tags as export defense-in-depth.
- Confirms websites, resolves IP/user-agent/device/browser/geolocation data, filters bots, and honors
  configured IP blocking.
- Derives deterministic session IDs from the source, client characteristics, and a rotating salt;
  caller-supplied identity IDs can instead anchor a session.
- Derives visits separately and rotates them when the signed visit token is more than 30 minutes old.
- Parses URL, referrer, UTM, advertising click-ID, custom-property, and Core Web Vitals fields.
- Stores identify payloads as typed session properties and event payloads as typed event properties.
- Recognizes positive `revenue` plus `currency` event data and writes revenue records.
- Returns a signed cache token with website, session, visit, and issued-at information.

### Session recorder and heatmaps

`src/recorder/index.js` uses rrweb and is separately bundled to `public/recorder.js`. It requests each
website's recorder configuration, applies replay/heatmap sample rates and masking rules, limits
duration, batches events, splits oversized snapshots, and flushes on intervals or lifecycle events.

`POST /api/record` requires the signed session token established by the normal tracker. It accepts
either replay or heatmap batches, caps request size and event count, rechecks the website's live
configuration, repeats bot/IP checks, and enforces cloud subscription restrictions where applicable.
PostgreSQL replay chunks are gzip-compressed; ClickHouse replay data can be inserted directly or
sent through Kafka.

## Data layer

### PostgreSQL and Prisma

`prisma/schema.prisma` is the canonical relational schema. Its models cover:

- Identity and ownership: `User`, `Team`, and `TeamUser`.
- Tracked resources: `Website`, `Link`, and `Pixel`.
- Core analytics: `Session`, `WebsiteEvent`, `EventData`, and `SessionData`.
- Analysis and presentation: `Report`, `Segment`, `Board`, and `Share`.
- Monetization: `Revenue`.
- Behavioral analytics: `SessionReplay`, `SessionReplaySaved`, and `HeatmapEvent`.

UUIDs are used throughout. Most user-owned resources support soft deletion, while analytics tables
are heavily indexed by website, time, session/visit, and commonly filtered dimensions. Typed event
and session property tables provide separate string, number, and date columns. Prisma uses the
PostgreSQL driver adapter, supports an optional read replica, and generates its client into
`src/generated/prisma` for application builds and into root `generated/` for standalone scripts.

The build generates Prisma clients and runs database checks/migrations unless explicitly skipped.
The README documents PostgreSQL 12.14+ as the supported source-install requirement; the database
check script itself rejects versions older than PostgreSQL 9.4.

### ClickHouse and Kafka

Setting `CLICKHOUSE_URL` switches analytics reads and writes to ClickHouse while PostgreSQL remains
the metadata store. `db/clickhouse/schema.sql` defines event, event-data, session-data, hourly stats,
revenue, replay, pivot, and heatmap tables/materialized views. Incremental SQL migrations evolve that
schema.

When Kafka configuration is present, ClickHouse-mode ingestion publishes supported event families
to Kafka topics instead of inserting them directly. The producer applies connection/send timeouts,
acknowledgement settings, and a configurable maximum message size. Without Kafka, the ClickHouse
client inserts rows directly.

### Redis

Redis is enabled by `REDIS_URL`. It backs cached lookups and server-side auth-session records. The
code provides a no-Redis path, so a normal PostgreSQL-only installation remains functional. With
Redis disabled, login issues a signed stateless token; with Redis enabled, it issues a signed token
that references a Redis auth key.

## Authentication, authorization, and privacy

Login validates bcrypt-compatible password hashes and binds issued authentication to a fingerprint
of the current password so password changes invalidate newer sessions. API clients send bearer
tokens. Administrators have global access, while normal users are authorized through direct resource
ownership or team membership and role permissions.

Public shares use separately typed signed tokens and require an explicit share-context header. This
prevents other token types signed with the same application secret, including tracker cache tokens,
from being reused for analytics access.

Privacy and abuse controls include:

- Deterministic salted identifiers rather than a tracker-set cross-site identity cookie.
- Optional Do Not Track handling and a local browser opt-out flag.
- Bot filtering and configurable ignored/blocked IP handling.
- Configurable IP source headers and MaxMind/geolocation support.
- Recorder sampling, duration limits, input masking, and stricter text masking modes.
- Configurable UI/login disabling, private mode, frame ancestors, forced HSTS, CORS lifetime, and
  Content Security Policy headers.
- Payload validation, field truncation, recording request limits, and formula-injection protection.

The deployment must provide a strong `APP_SECRET`; the Compose file intentionally uses a placeholder
that operators must replace.

## Internationalization and geo assets

`next-intl` integrates with Next.js through `src/i18n/request.ts`. English (United States) is the
server fallback, while the client selects locale-specific messages from `public/intl/messages/` and
updates both document language and text direction. The repository includes dozens of translated
message catalogs and matching country/language-name datasets.

Geo support is built by `scripts/build-geo.js`. Static country/region maps and browser/device/OS
images are shipped under `public/`. MaxMind database paths, license-based downloads, or a configured
geo database URL can customize location resolution.

## Build and developer workflows

Important package scripts are:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js Turbo development server with `.env` loading. |
| `pnpm build` | Check environment, build Prisma clients, check/migrate the database, build tracker and recorder bundles, build geo data, and build the Next.js app. |
| `pnpm start` | Start the production Next.js server. |
| `pnpm build-docker` | Build database clients, browser bundles, geo assets, and the app without the normal host environment/database checks. |
| `pnpm test` | Run the Vitest suite once. |
| `pnpm test:watch` | Run Vitest in watch mode. |
| `pnpm test:e2e` | Run Playwright end-to-end tests. |
| `pnpm lint` | Lint the repository with Biome. |
| `pnpm format` | Format the repository with Biome. |
| `pnpm check` | Apply Biome lint/format fixes. |
| `pnpm seed-data` | Seed development/demo data. |
| `pnpm change-password` | Run the password maintenance helper. |
| `pnpm build-components` | Bump component package metadata and bundle the public component entry with tsup. |

The TypeScript configuration is strict but allows JavaScript and disables `strictNullChecks`; Next.js
is also configured to ignore TypeScript errors during production builds. The `@/*` alias maps to
`src/*`. Biome enforces two-space indentation, single quotes, trailing commas, organized imports, and
a 100-column line width, with selected accessibility, CSS, and framework rules relaxed for this
codebase.

The component build starts at `src/index.ts`, which re-exports selected settings, team, website,
chart, shared UI, hook, input, and metric components. tsup emits an ESM package and declarations to
`dist/`, using the metadata in `package.components.json`.

## Testing and CI

Vitest discovers `src/**/*.test.{ts,tsx}` in a jsdom environment. Shared helpers under `src/test/`
configure Testing Library, navigation mocks, and MSW request handlers. Current unit tests concentrate
on reusable libraries, permissions, a shared component, and selected API routes.

Playwright uses `tests/e2e/`, a configurable base URL, the `data-test` selector convention, and
desktop Chromium. It runs non-parallel by default, starts `pnpm dev` unless told to reuse an external
server, and captures a trace on the first retry. The scenarios cover login plus user, website, team,
and corresponding API workflows.

The main GitHub CI workflow runs on pushes in the upstream Umami repository. It installs pnpm, uses
Node.js 22, runs `pnpm test`, and then runs the full `pnpm build` with a dummy database URL and the
database check disabled. Contributor documentation additionally asks contributors to run build and
lint before submitting a focused pull request.

## Deployment options

- Source deployment: provide PostgreSQL through `DATABASE_URL`, build, and run the Next.js server on
  port 3000 by default.
- Docker Compose: run the published Umami image with PostgreSQL 15, persistent database storage, and
  `/api/heartbeat` health checks.
- Custom Docker image: use the multi-stage Alpine/Node 22 build, Next.js standalone output, generated
  Prisma assets, and a non-root runtime user.
- Podman: use the provided Compose, sample environment, and systemd user-service assets.
- Platform manifests: `app.json` supports Heroku-style deployment and `netlify.toml` configures the
  Netlify Next.js plugin plus geo files.

`next.config.ts` supports mounting under `BASE_PATH`, moving/proxying the API with `API_URL`, changing
the collection endpoint, renaming or externally hosting the tracker, setting cache/CORS behavior,
and cloud-mode rewrites. Production output is standalone for container-friendly deployment.

## Practical onboarding guide

For a new contributor, the shortest useful reading path is:

1. Read `README.md`, `package.json`, and `next.config.ts` for installation, scripts, and runtime
   configuration.
2. Browse `src/app/(main)/` for product screens and `src/app/api/` for their server contracts.
3. Follow one endpoint from its route handler through `src/permissions/`, `src/queries/prisma/`, or
   `src/queries/sql/`.
4. Read `src/tracker/index.js` and `src/app/api/send/route.ts` together to understand collection.
5. Read `prisma/schema.prisma`; if working on scale-oriented analytics, also read
   `db/clickhouse/schema.sql` and `src/lib/clickhouse.ts`.
6. Reuse common schemas, response helpers, authorization functions, hooks, and components rather
   than duplicating route-specific infrastructure.
7. Add colocated Vitest coverage for isolated behavior and Playwright coverage for user-visible
   workflows that cross the UI/API boundary.

Two operational details are especially important: a normal full build is database-aware and may run
migrations, and browser bundles in `public/script.js` and `public/recorder.js` are generated from
their sources rather than edited directly.

STEER-MARKER-CODEX-55
