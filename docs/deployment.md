# Vercel and MongoDB deployment

No deployment has been performed by the coding task. Use the repository root as the Vercel project directory. Deploy the new platform rather than any of the three original project folders.

1. Create a MongoDB Atlas cluster and a dedicated `aarohan` database. Use a least-privilege database user with read/write access to this database. Atlas supplies the replica set required by team and scoring transactions.
2. Configure Atlas network access for your Vercel egress arrangement. Choose an appropriate deployment region near the Atlas region. Do not paste credentials into committed files or chat.
3. Add `MONGODB_URI`, `APP_ORIGIN` (the exact final HTTPS origin), and `NODE_ENV=production` to Vercel. Preview deployments need their own matching origin and a separate test database. No frontend API URL or Firebase credential is required; all browser APIs are same-origin.
4. Use Node 22 LTS or a supported newer Node runtime in Vercel. Run `npm ci` and `npm run build` locally. Root `vercel.json` defines a root workspace build, static output and Node API function.
5. Import the root repository into Vercel, or use the Vercel CLI: `vercel` for a preview and `vercel --prod` for production. Deployment was not executed here. Do not deploy the test data or `.cache` directory.
6. Before opening registration, run the administrator bootstrap locally against the intended database with privately set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (16+ characters). Run `npm run bootstrap`, then remove the bootstrap password. The script refuses to run when an admin already exists.
7. Normal participants use leader registration and five-field login; pre-import is unnecessary. If migrating historical participants, supply their full matching identity including email and team association. Optional legacy imports use `npm run import:students -- students.json` first, then `npm run import:students -- students.json --apply`. Input is a JSON array of `{name, rollNo, phoneNo, email?}`. Database conflicts roll back the entire import. Do not automatically run imports at deployment.
8. Review legacy data via `npm run migrate`, following `docs/migration.md`. Back up both source and target before applying.
9. Publish real Puzzle and Detective content. Configure each game's window, attempts, weights and game-specific controls from the admin page.
10. Verify HTTPS, `/api/health`, login/logout, cookie flags, direct URL refresh, all four games on real devices, leader registration, first-login teammate enrollment, ordered round unlocking, leaderboard updates and audited score corrections. Verify camera access inside the same-origin frames.

## Current Vercel configuration — single project

The latest repository commit switched to a single-project layout. This layout is now explicit and verified through the full local Vercel production build. Set Framework Preset to **Other**, Root Directory to the repository root (blank or `.`), and Node.js to **24.x**. Clear dashboard command/output overrides; root vercel.json defines them. The checked-in `framework: null` disables framework auto-detection and overrides a stale preset. Do not switch back to Services without restoring a services configuration and rechecking installation/output packaging together.

One root install explicitly selects both @aarohan/backend and @aarohan/frontend, includes dev dependencies and the workspace root, then npm run build compiles both applications. Static output is frontend/dist. api/index.js exports the backend Express application as the Node function. api/ must be included in uploads for this layout. Same-origin /api requests reach this function. No runtime service bindings are needed.

Only root package.json contains the pinned esbuild@0.25.12 allowScripts approval. Workspace-level fields are ignored by npm; frontend/package.json has no allowScripts field. Both private .env files and their templates are excluded from upload; configure runtime environment variables in Vercel. Original game repositories, documentation, tests, caches and local node_modules remain excluded. Backend/frontend sources, manifests, root lockfile, api and scripts remain included.

## Routing and connections

The /api/:path* rewrite targets /api/index, the exported Express function. SPA routes use index.html. The fallback excludes assets, file extensions and Calculator/Memory frames so JavaScript, CSS, favicon and game documents are served directly. Backend Express routes retain the /api prefix. backend/src/server.js is local development only.

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


## Install-script and audit warnings

The service configuration now builds successfully in the supplied Vercel log. Funding notices and .vercelignore removals are informational. Dependency audit fixes are recorded in the committed manifests and package-lock.json: Sharp >=0.35.5, and a narrow Concurrently shell-quote override at 1.11.0. Commit the lockfile with the manifests so npm ci uses patched packages.

The esbuild@0.25.12 script is explicitly allowed only in the root package.json; npm ignores workspace-level allowScripts fields. Keep this declaration aligned with the exact locked esbuild version when updating Vite. Do not approve all scripts or suppress npm auditing to hide warnings. Sharp 0.35.5 has no install lifecycle check requiring approval. Run npm 12 install-scripts ls from the repository root to review this policy; that command does not support workspace selection. The root and per-service build commands remain unchanged.


## ENOENT while deploying outputs

The reported missing /vercel/path0/node_modules/cookie-parser/package.json was reproduced with Node 24 and npm 12: the backend install created cookie-parser, then the frontend install removed it. npm ci removes the existing shared node_modules tree, and an implicit current-workspace filter remains active even with --workspaces. Vercel had already traced backend dependencies before the frontend install, so final output packaging referenced a removed file.

Both install commands now explicitly select --workspace @aarohan/backend and --workspace @aarohan/frontend, along with --include-workspace-root and --include=dev. Each install produces the same full dependency tree. Do not replace those explicit selectors with --workspaces alone, and do not add a parent-prefix override. The isolated reproduction verified that cookie-parser, Vite and every backend runtime dependency remained available after both service installs/builds. .vercelignore correctly excludes local node_modules, which Vercel recreates during installation; it does not exclude backend/src, manifests, lockfile or build scripts.


## Full local packaging verification

The final isolated check ran Vercel CLI 62.5.0 with Node 24.19.0 and local-only project metadata, without private credentials or any deployment. It completed the root install/build and generated .vercel/output/static/index.html plus .vercel/output/functions/api/index.func/.vc-config.json (nodejs24.x, api/index.js handler). A test-only Windows shell lookup workaround was necessary for the CLI's Linux-oriented spawn environment; it is confined to .cache and is not application code or uploaded content. Cloud builds run on Linux and do not use that workaround.

Commit/push all configuration changes together, then deploy that new commit. An npm allowScripts warning mentioning frontend means a deployed manifest still contains a workspace-level field; check the deployment's exact Git commit against frontend/package.json. Do not redeploy an older commit expecting local edits to apply. Cloud runtime/Atlas connectivity and HTTPS camera checks still require verification on the actual deployed origin.
