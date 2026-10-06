# Fingertip Frenzy — implementation report

Implemented in this workspace with passing build, lint and 18 automated checks. Browser verification covered common authentication, teams, administration, Puzzle/Detective completion, all three Memory stages and Calculator's presence lobby. Production deployment and physical camera play remain unverified.

## Architecture and technologies

React 19 / Vite 6 frontend; Express 4 / Mongoose 8 backend; one MongoDB database and same-origin API. Zod validates requests, scrypt protects admin passwords, opaque cookies authenticate users, Helmet supplies API headers, and Sharp crops images. Vercel builds two services: an Express API and a Vite frontend. MongoDB stores game state, deadlines and results; there is no production disk fallback or background socket requirement. This is JavaScript; the syntax check is not TypeScript checking.

~~~
frontend/src/       Layouts, auth, student/admin pages, retained React games
frontend/public/    Original assets and isolated Calculator/Memory DOM games
backend/src/        Models, middleware, validation, services, engines and routes
backend/test/       Six engine checks and twelve MongoDB integration checks
vercel.json         Public routing for independently built services
scripts/            Bootstrap, indexes, imports, migration and isolated UI fixture
docs/               Audit, content, deployment, verification and change manifest
~~~

The three uploaded directories contain four games: Vortex supplies Puzzle and Detective. Originals remain unchanged; imported copies receive integration changes. Calculator/Memory use same-origin frames to isolate their global CSS/DOM. Puzzle/Detective remain React pages with prefixed original CSS.

## Database schema

| Model | Data and integrity |
|---|---|
| PlatformUser | Name, unique roll/phone, optional email, role, status, team; admin password hash excluded from ordinary reads |
| PlatformTeam | Unique invitation code, leader, members, status; transactional membership |
| PlatformAuthSession | Token hash, user, expiry; TTL index |
| PlatformSetting / PlatformGameSetting | Team capacity; game windows, enabled state, weights, attempts and mechanics |
| PlatformGameSession | Unique game/scope/attempt, snapshot configuration, persisted state, score, maximum, revision, timestamps |
| PlatformGameResult | Unique session reference, team/user/game, raw score, maximum, duration, validity |
| PlatformGameContent | Game, title, publication, order, validated puzzle or case data |
| PlatformImageAsset | Cropped JPEG bytes and MIME type, served by opaque ID |
| PlatformAuditLog | Actor, action, entity, previous/new values, time |
| PlatformRateBucket | Persistent request counter and TTL expiry |

Create indexes explicitly with scripts/indexes.mjs. Transactions require a replica set. Leaderboard window functions require MongoDB 5.0+.

## Authentication and team flow

Only the leader registers with team name, name, roll, phone and email. Registration creates the leader and team atomically and generates a unique FF- invitation code. Participants log in with that code plus all four identity fields. New teammates join on first login; existing participants must match their saved identity and team. Administrators use privately provisioned email/password credentials. The server issues an HTTP-only opaque cookie, storing only its hash. Requests resolve current user status. Logout removes the session; expiry/deactivated users lose access. Mutating requests must match APP_ORIGIN. Production cookies are Secure and SameSite=Lax. No auth token enters game URLs.

A registered leader shares the invitation code with two teammates. Transactions enforce one team, unique members, registered identity and capacity. Team names are immutable after registration, including for administrators. Admins edit member identities, rosters, leaders, invitation codes and status. Identity changes revoke sessions. Member deletion detaches the roster transactionally, requires replacement of a current leader and rejects active attempts; team deletion abandons attempts and revokes member sessions. Active attempts lock membership. Calculator requires exactly three members regardless of larger global capacity.

## Game integration

- Calculator retains its camera/equation/variable UI. Original Python question templates and state machine are ported to Node. Leader start, three-member presence, pauses, stable digit values, deadlines and scoring are server-owned. One-second polling uses five-second presence leases.
- Memory retains sequence animation, gesture input, review and certificate. The server generates unique digits and scores positional answers through three ordered stages. Settings come from the attempt snapshot. Completed stages survive reload. Lost submission responses recover by reading saved results; interrupted active stages require an audited reset.
- Puzzle retains Vortex's board, drag/click tiles, hints, countdown and attempt history. Opaque piece IDs and sequential puzzle identity prevent replay. Organizer PNG/JPEG/WebP uploads are validated, cropped by Sharp and persisted in MongoDB.
- Detective retains cases, evidence, questions and hints. The server hides correct answers, enforces question order, charges hints once, applies penalties and persists actual completion.

## Leaderboard logic

Select each team's best valid raw attempt per game; Memory selects each current member's best result. Normalize against that attempt's maximum, clamp to 0–1, then multiply by weight × 10. Memory averages member ratios over the full current roster, with missing results counted as zero. Different configuration snapshots remain comparable.

Four default weights of 25 yield a 1,000-point maximum. If organizers change the weight sum, the maximum is ten times that sum. Ties use completed games, total completion time and stable team identity. Memory counts as completed only when all current members have results. Game filters use raw points. Search/pagination preserve true ranks. Audited corrections affect the next aggregate immediately.

## Admin capabilities

The visible portal contains only the leaderboard and four ordered game sections. Standings provide filters, paginated exports and score review. Per-game sections provide settings, content, results, correction/invalidation and scoped retries. Result corrections cannot exceed attempt maximum; edits/resets require reasons. Team/member editors and deletion controls are embedded in the leaderboard; separate student, team, overview, settings and audit UI routes remain removed.

| Section | Game-specific controls |
|---|---|
| Calculator | Difficulty sequence, level timers/base points, speed bonus, stability threshold, confidence and variable locking |
| Memory | Digit count, display interval and answering interval for all three stages |
| Puzzle | Validated library, image upload/cropping grid, points, hints and publication |
| Detective | Narrative, suspects, evidence, questions/options, correct answers, hints/penalties and publication |

All sections also expose availability, start/end windows, weight, attempts and results registers. Controls are typed forms rather than raw JSON.

## Files created, modified and removed

Exact current paths are in change-manifest.json. New platform files live under frontend/backend/api/scripts/docs plus root configuration. Imported game copies were modified for shared identity, API transport, server scoring, replay protection and styling isolation. Source fingerprints were rechecked: no original file was modified or removed. Unused copied Memory app/admin/leaderboard scripts and temporary one-off authoring helpers were removed from the new implementation.

## Environment and local setup

Runtime: MONGODB_URI, APP_ORIGIN, NODE_ENV. PORT is local-only. ADMIN_EMAIL and ADMIN_PASSWORD are bootstrap-only; remove the bootstrap password afterwards. Private configuration is in backend/.env, with root .env as a fallback and process variables taking precedence. frontend/.env contains only public branding. Both actual files and separate templates have been created; no private value is bundled in the frontend.

~~~powershell
npm ci
Copy-Item backend/.env.example backend/.env
# Privately configure replica-set/Atlas URI, matching origin and bootstrap credentials.
npm run bootstrap
node scripts/indexes.mjs
npm run import:students -- students.json
npm run import:students -- students.json --apply
npm run dev
~~~

Organizer input is a JSON array of name, rollNo, phoneNo and optional email. Imports/migration default to dry-run and apply atomically. Publish real event content in admin. The optional UI fixture never uses the user's database URI.

## Vercel and MongoDB Atlas

Create a dedicated Atlas database and database-scoped read/write account; configure network access for Vercel egress and nearby deployment regions. Set MONGODB_URI, exact HTTPS APP_ORIGIN and NODE_ENV=production privately in Vercel. Use Node 22 LTS. Run bootstrap/indexes deliberately against that database. Preview deployments need a separate test database and matching origin.

~~~powershell
npm ci
npm run build
npm run lint
npm test
# Authenticate the official Vercel CLI and select this repository root.
vercel
vercel --prod
~~~

Root vercel.json defines backend (Express, src/app.js) and frontend (Vite, dist) services. /api and /api/* route to backend, with the original path preserved; the final catch-all routes to frontend. Its SPA fallback excludes static assets, game frames and development modules. The obsolete root api handler is excluded from deployment. The backend function has a 30-second limit. No bindings are needed: browsers call public same-origin /api and backend imports all game engines locally. Original game repositories are preserved sources, not additional deployed services. CSP permits only same-origin platform scripts; game paths additionally allow retained inline handlers, WebAssembly and MediaPipe hosts. Both restrict objects, framing, base URLs and forms. See deployment.md for full configuration. No deployment was performed.

## Known limitations

- Atlas/Vercel credentials were not supplied. Deployed routing, CSP, HTTPS camera permissions, event load and participant-device gesture accuracy remain unverified.
- Calculator's engine is tested and browser lobby checked; a full three-device camera playthrough was not performed.
- Memory browser play used short test-only stages and timeout input, producing genuine zero results. Correct scoring is tested through MongoDB; physical gestures are not claimed.
- Roll/phone verifies matching provisioned records, not phone ownership. Browser recognition cannot attest a real physical hand.
- Legacy dry-run found eight records needing correction. Original private records remain untouched; old admin credentials/untrusted scores are not silently imported.
- CSV/admin/leaderboard rows are paginated. Content listings currently cap at 100 items per game.
- MediaPipe/fonts depend on external availability. Original inline game handlers require a more permissive frame CSP. Active Memory stages require organizer reset after interruption.


## Latest event interface and sequence

The platform is branded Fingertip Frenzy, organized by IEEE SB NIT Durgapur for Aarohan 2026. A midnight background with amber, mint and per-round accents covers the landing page, authentication, dashboard, teams and administration. The landing page has interactive round previews, animated geometric tiles, hover feedback and a responsive layout. Reduced-motion preferences disable animations.

The enforced round sequence is Image Formation, Detective Case, AI Calculator and Number Memory. The server requires a valid result from the preceding round before creating the next attempt; the dashboard displays disabled locked cards. Direct API requests cannot skip this progression.

The latest build transformed 1,610 modules, lint reported zero warnings/errors and all 18 tests passed. Updated browser checks verified leader registration/code generation, five-field login, automatic teammate enrollment, dark dashboard and five-item admin navigation. See verification.md for evidence and remaining live-device checks.
