# Vercel and MongoDB deployment

No deployment has been performed by the coding task. Use the repository root as the Vercel project directory. Deploy the new platform rather than any of the three original project folders.

1. Create a MongoDB Atlas cluster and a dedicated `aarohan` database. Use a least-privilege database user with read/write access to this database. Atlas supplies the replica set required by team and scoring transactions.
2. Configure Atlas network access for your Vercel egress arrangement. Choose an appropriate deployment region near the Atlas region. Do not paste credentials into committed files or chat.
3. Add `MONGODB_URI`, `APP_ORIGIN` (the exact final HTTPS origin), and `NODE_ENV=production` to Vercel. Preview deployments need their own matching origin and a separate test database. No frontend API URL or Firebase credential is required; all browser APIs are same-origin.
4. Use Node 22 LTS or a supported newer Node runtime in Vercel. Run `npm ci` and `npm run build` locally. Root `vercel.json` defines independently built backend and frontend services.
5. Import the root repository into Vercel, or use the Vercel CLI: `vercel` for a preview and `vercel --prod` for production. Deployment was not executed here. Do not deploy the test data or `.cache` directory.
6. Before opening registration, run the administrator bootstrap locally against the intended database with privately set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (16+ characters). Run `npm run bootstrap`, then remove the bootstrap password. The script refuses to run when an admin already exists.
7. Normal participants use leader registration and five-field login; pre-import is unnecessary. If migrating historical participants, supply their full matching identity including email and team association. Optional legacy imports use `npm run import:students -- students.json` first, then `npm run import:students -- students.json --apply`. Input is a JSON array of `{name, rollNo, phoneNo, email?}`. Database conflicts roll back the entire import. Do not automatically run imports at deployment.
8. Review legacy data via `npm run migrate`, following `docs/migration.md`. Back up both source and target before applying.
9. Publish real Puzzle and Detective content. Configure each game's window, attempts, weights and game-specific controls from the admin page.
10. Verify HTTPS, `/api/health`, login/logout, cookie flags, direct URL refresh, all four games on real devices, leader registration, first-login teammate enrollment, ordered round unlocking, leaderboard updates and audited score corrections. Verify camera access inside the same-origin frames.

## Vercel project settings and services

Keep the Vercel project Framework Preset set to **Services** and Root Directory at the repository root (blank or `.`), not frontend or backend. Remove legacy dashboard build/install/output overrides; the checked-in service configuration owns these settings. Select Node 22 LTS or a supported newer runtime. Redeploy the new Git commit containing this vercel.json; redeploying an older commit keeps its old configuration.

| Service | Root | Framework / entrypoint | Public paths |
|---|---|---|---|
| backend | backend | Express / src/app.js | /api and /api/* |
| frontend | frontend | Vite / dist | All remaining paths |

A project configured as Services must have a nonempty `services` object. Do not replace this file with a single-project config while leaving the Vercel framework set to Services; that mismatch causes the reported fatal error.

Each service installs with `npm ci --include=dev --workspaces --include-workspace-root`. npm discovers the root workspace lockfile; never use `--prefix ..`, since Vercel may already run installation at the repository root. Explicit named-workspace build commands select only the intended service. Frontend development honors Vercel's assigned PORT via dev.mjs. Build/runtime keys belong inside each service; only routing and headers stay at the top level.

There are no internal services or bindings. Browser requests use public same-origin /api, backend game engines are local imports, and MongoDB is external. Original game folders are preserved reference sources rather than additional services. The unused root api/ handler is excluded by .vercelignore; the backend service uses backend/src/app.js directly.

## Routing and connections

Top-level object rewrites route /api and /api/* to the backend service with the original prefix preserved. The final catch-all routes to frontend. Its service-level SPA rewrite serves index.html for application deep links while excluding assets, file extensions, retained game frames and Vite development modules. backend/src/app.js exports Express without listening; backend/src/server.js is local development only.

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

Two deployment failures were reported: npm EUSAGE from `npm ci --prefix ..`, then “Project framework is set to services, but no services are declared” after the repository was changed to a single-project config. The current configuration restores declared backend/frontend services, removes parent-prefix installation and scopes build commands correctly. Keep the dashboard framework at Services and deploy this updated commit. The root api/ exclusion removes its services-mode warning.

## Private standings

Global standings, rank information and leaderboard exports require administrator authentication. Participants use /api/teams/me/score; the server derives the team from the authenticated active roster rather than accepting a client-selected team. Dashboard and My team show only that team's game scores and weighted total. This endpoint returns no rank or other team rows.
