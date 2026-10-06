# Vercel and MongoDB deployment

No deployment has been performed by the coding task. Use the repository root as the Vercel project directory. Deploy the new platform rather than any of the three original project folders.

1. Create a MongoDB Atlas cluster and a dedicated `aarohan` database. Use a least-privilege database user with read/write access to this database. Atlas supplies the replica set required by team and scoring transactions.
2. Configure Atlas network access for your Vercel egress arrangement. Choose an appropriate deployment region near the Atlas region. Do not paste credentials into committed files or chat.
3. Add `MONGODB_URI`, `APP_ORIGIN` (the exact final HTTPS origin), and `NODE_ENV=production` to Vercel. Preview deployments need their own matching origin and a separate test database. No frontend API URL or Firebase credential is required; all browser APIs are same-origin.
4. Use Node 22 LTS or a supported newer Node runtime in Vercel. Run `npm ci` and `npm run build` locally. Root `vercel.json` defines independent frontend and backend service builds.
5. Import the root repository into Vercel, or use the Vercel CLI: `vercel` for a preview and `vercel --prod` for production. Deployment was not executed here. Do not deploy the test data or `.cache` directory.
6. Before opening registration, run the administrator bootstrap locally against the intended database with privately set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (16+ characters). Run `npm run bootstrap`, then remove the bootstrap password. The script refuses to run when an admin already exists.
7. Normal participants use leader registration and five-field login; pre-import is unnecessary. If migrating historical participants, supply their full matching identity including email and team association. Optional legacy imports use `npm run import:students -- students.json` first, then `npm run import:students -- students.json --apply`. Input is a JSON array of `{name, rollNo, phoneNo, email?}`. Database conflicts roll back the entire import. Do not automatically run imports at deployment.
8. Review legacy data via `npm run migrate`, following `docs/migration.md`. Back up both source and target before applying.
9. Publish real Puzzle and Detective content. Configure each game's window, attempts, weights and game-specific controls from the admin page.
10. Verify HTTPS, `/api/health`, login/logout, cookie flags, direct URL refresh, all four games on real devices, leader registration, first-login teammate enrollment, ordered round unlocking, leaderboard updates and audited score corrections. Verify camera access inside the same-origin frames.

## Service layout and local verification

| Service name | Root / framework | Public routing | Calls another service |
|---|---|---|---|
| backend | backend / Express | /api and /api/* | No |
| frontend | frontend / Vite | All remaining paths | No runtime function calls |

There are no internal services or service bindings in the proposed configuration. Browser requests from the static frontend use public same-origin `/api`; bindings are only available in function runtime, not Vite builds or browser code. Backend game engines are local modules. MongoDB is an external database. The original Python games and Vortex client/server folders remain preserved source references and are excluded from deployment; their engines/interfaces are already integrated in the two active services.

Each service installs the shared workspace lockfile with `npm ci --include=dev --workspaces --include-workspace-root`. npm resolves the workspace root automatically; do not use `--prefix ..`, because Vercel can already execute installation from the repository root. Development dependencies are included so Vite/Tailwind are available even with NODE_ENV=production. Explicit `--workspace @aarohan/backend` and `--workspace @aarohan/frontend` build commands work from either the repository or service directory. Backend exports `src/app.js` with a 30-second function duration; frontend outputs `dist`. Build/runtime settings belong inside each service. Public rewrites and security headers remain at the root. See the [services configuration](https://vercel.com/docs/services/config-reference), [routing](https://vercel.com/docs/services/routing) and [runtime bindings](https://vercel.com/docs/services/bindings) documentation.

For local shared routing, run `vercel dev` after configuring the runtime environment. `vercel dev -L` runs local-only without linking a cloud project. `frontend/dev.mjs` honors Vercel's assigned service `PORT`; plain standalone Vite otherwise chooses its own port. Set APP_ORIGIN to the shared browser URL. Never manually set a Vercel-injected binding variable if future function-to-function calls add bindings.

The service names, omitted legacy services, public paths and absence of bindings are prepared for user confirmation. Deployment has not been performed.

## Routing and connections

Vercel services mode routes `/api` and `/api/*` to the `backend` service, preserving the `/api` prefix that Express already uses. The final catch-all routes to the `frontend` service. Its service-level SPA rewrite serves `index.html` for application deep links while excluding assets, game frames, file extensions and Vite development modules. Static game bundles live under `/games/calculator/` and `/games/memory/`, and are served directly. The backend entrypoint is `backend/src/app.js`, which exports the Express app without listening, starting intervals or writing local state. The obsolete root `api/` handler is excluded by `.vercelignore`. `backend/src/server.js` is local development only.

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

The reported failure on commit 9cf6b50 was `npm ci --prefix ..` exiting with EUSAGE. The parent-prefix override has been removed. The unused root api/ directory is excluded again, eliminating the warning that it cannot be built in services mode; backend/src/app.js remains the active Express entrypoint. Keep the Vercel project's Root Directory at the repository root so both services and the root lockfile are available. Clear conflicting dashboard build/install overrides and redeploy the commit containing these fixes.
