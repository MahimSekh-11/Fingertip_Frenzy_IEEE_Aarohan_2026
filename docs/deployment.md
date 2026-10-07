# Vercel and MongoDB deployment

No deployment has been performed by the coding task. Use the repository root as the Vercel project directory. Deploy the new platform rather than any of the three original project folders.

1. Create a MongoDB Atlas cluster and a dedicated `aarohan` database. Use a least-privilege database user with read/write access to this database. Atlas supplies the replica set required by team and scoring transactions.
2. Configure Atlas network access for your Vercel egress arrangement. Choose an appropriate deployment region near the Atlas region. Do not paste credentials into committed files or chat.
3. Add `MONGODB_URI`, `APP_ORIGIN` (the exact final HTTPS origin), and `NODE_ENV=production` to Vercel. Preview deployments need their own matching origin and a separate test database. No frontend API URL or Firebase credential is required; all browser APIs are same-origin.
4. Use Node 22 LTS or a supported newer Node runtime in Vercel. Run `npm ci` and `npm run build` locally. Root `vercel.json` defines the workspace build, static output and API function.
5. Import the root repository into Vercel, or use the Vercel CLI: `vercel` for a preview and `vercel --prod` for production. Deployment was not executed here. Do not deploy the test data or `.cache` directory.
6. Before opening registration, run the administrator bootstrap locally against the intended database with privately set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (16+ characters). Run `npm run bootstrap`, then remove the bootstrap password. The script refuses to run when an admin already exists.
7. Normal participants use leader registration and five-field login; pre-import is unnecessary. If migrating historical participants, supply their full matching identity including email and team association. Optional legacy imports use `npm run import:students -- students.json` first, then `npm run import:students -- students.json --apply`. Input is a JSON array of `{name, rollNo, phoneNo, email?}`. Database conflicts roll back the entire import. Do not automatically run imports at deployment.
8. Review legacy data via `npm run migrate`, following `docs/migration.md`. Back up both source and target before applying.
9. Publish real Puzzle and Detective content. Configure each game's window, attempts, weights and game-specific controls from the admin page.
10. Verify HTTPS, `/api/health`, login/logout, cookie flags, direct URL refresh, all four games on real devices, leader registration, first-login teammate enrollment, ordered round unlocking, leaderboard updates and audited score corrections. Verify camera access inside the same-origin frames.

## Current deployment layout

The latest repository commits use a single Vercel project, rather than services mode. Keep the project Root Directory at the repository root, Framework Preset at Other, and remove conflicting dashboard command overrides. The root config installs with `npm ci --include=dev`, builds with `npm run build`, serves `frontend/dist`, and bundles `api/index.js` as the Express function. Vite/Tailwind must be installed even when NODE_ENV=production. npm uses the committed root workspace lockfile; do not add `--prefix ..`.

The api/ directory must remain in the deployment upload for this layout. It imports the backend Express app from backend/src/app.js. There are no separately deployed services or bindings. All browser requests remain same-origin under /api. Original game repositories remain preserved source references and are excluded from deployment.

## Routing and connections

Vercel routes /api and /api/* to the api/index.js function. Other application deep links use frontend/dist/index.html. Static assets, file extensions and the /games/calculator/ and /games/memory/ frames are excluded from the SPA fallback. The API function exports the backend Express app without starting a listener. backend/src/server.js is local development only.

MongoDB connection creation is cached per function instance; sessions, game state, rate limit windows, scores and audit records are MongoDB data. Instances have no shared in-memory production state. Authentication uses opaque random cookie tokens and stores only token hashes. Cookies are secure in production, HTTP-only and SameSite=Lax. Every state-changing request must match `APP_ORIGIN`. Keep frontend and API on one origin.

Indexes are declared in the models. Before the event, run `node scripts/indexes.mjs` against the database to create/verify indexes without destructive `syncIndexes` calls. MongoDB's leaderboard window function requires MongoDB 5.0 or newer.

Security headers include nosniff, referrer policy, same-origin framing and camera permissions scoped to self. Root vercel.json sets a route-specific CSP: the platform permits only same-origin scripts; game frames additionally permit retained inline handlers, WebAssembly and the MediaPipe CDN/model host. Both deny objects and restrict framing, forms and base URLs. Original inline game code requires this more permissive frame policy. Validate the policy on the deployed HTTPS origin and actual cameras before launch.

## Operations

- Login endpoints use persistent rate-limit counters. Origin checking is strict; a mismatched public domain returns 403.
- Team names cannot change after registration, including for administrators. Identity edits revoke existing sessions. Replace a leader before deleting that member, and reset active attempts before removing members. Team deletion abandons active attempts and revokes member sessions. Team/member deletion retains historical records. Score correction, invalidation and attempt reset require reasons and create audit records within the mutation transaction.
- CSV exports are paginated (100 records per export page); pass `?page=N`. Formula-like values are escaped. There is no unbounded production export query.
- Leaderboard updates are derived from current valid results. Recalculation occurs on every request rather than maintaining a stale second leaderboard collection.
- Database errors return a generic 503 with a request ID. The service never writes a fallback JSON file or manufactures results.



## Build-log troubleshooting

`Removed ... ignored files` is an informational upload-filter message. Private .env files, documentation, tests, cached builds and legacy game sources are intentionally excluded. Excluding .env.example does not remove runtime environment variables configured in Vercel.

The reported failure on commit 9cf6b50 was `npm ci --prefix ..` exiting with EUSAGE. The parent-prefix override has been removed. Services mode was subsequently removed by repository commits. The root api/ handler is now required and remains included; this removes the services-mode warning while retaining backend/src/app.js as the Express application. Keep the Vercel project's Root Directory at the repository root so frontend, backend, api and the root lockfile are available. Clear conflicting dashboard build/install overrides and redeploy the commit containing these fixes.


## Private standings

Global standings, rank information and leaderboard exports require administrator authentication. Participants use /api/teams/me/score; the server derives the team from the authenticated active roster rather than accepting a client-selected team. Dashboard and My team show only that team's game scores and weighted total. This endpoint returns no rank or other team rows.
