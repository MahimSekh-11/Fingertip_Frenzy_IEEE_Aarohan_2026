# Verification record

Locally verified 2026-10-07 (Asia/Calcutta), Windows, Node 20.15 / npm 10.7. Recommend Node 22 LTS for production.

## Commands actually run

- npm ci passed with the regenerated lockfile: 270 packages installed in 25 seconds, no metadata warnings. Preview processes were stopped before installation to release Windows native module locks.
- npm run build passed: 1,610 Vite modules transformed; frontend emitted; backend syntax passed.
- npm run lint passed: zero warnings/errors.
- npm test passed: 18 checks, zero failures/skips.
- Legacy migration dry-run: eight teams require correction; source/target unmodified.
- Original Detective case dry-run validated the bundled case.
- Source SHA-256 comparison: all inventoried original files unchanged.

Syntax checks are not TypeScript type checking.

## Automated coverage

Twelve integration checks use actual Express routes, unique indexes and a real isolated MongoDB replica set. Temporary fixtures never seed production.

1. Leader registration, atomic code creation, duplicate prevention, full five-field login, origin protection, private cookie, authorization, logout and expiration.
2. First-login teammate enrollment, capacity, invalid code, immutable team names, exact four-round order and rejection of attempts that skip earlier rounds.
3. Memory sequence/timing/order, rejection of client scores and persisted three-stage completion.
4. Puzzle server answers, completion and replay rejection.
5. Detective hidden answers/hints, sequential questions, replay rejection and hint penalties.
6. Calculator shared state, original valid equation and persisted result.
7. Four-game standings, score correction limits/audit, immutable names and admin sections.
8. Simultaneous joins at capacity: one success, one conflict; roster remains valid.
9. Multi-team search/rank/pagination and Memory ratios across different maximum snapshots.
10. Upload authorization, malformed images, real Sharp crops, retrieved image bytes and audited draft.
11. Scoped reset invalidates result and grants only its player a retry.
12. Admin identity edits and normalized email, session revocation, immutable names at route/model levels, leader transfer, active-attempt deletion guards, transactional member removal and team deletion with retained history/audits.

Six engine checks cover nonrepeated Memory digits/positional score, all Calculator difficulty templates, leader start/presence pause, normalization, tie ordering and configuration validation. Deterministic server checks advance stored clocks or shorten snapshot sequences; actual browser play is separate.

## Earlier game-mechanics browser checks (before the event redesign)

Only a temporary test database was used.

- Student login/logout, dashboard and expired session after fixture restart.
- Team creation and invitations for two members; displayed three-person roster.
- Detective: played all three original questions; completion showed 350 raw points and shared standings showed 250 weighted points.
- Puzzle: placed four visible image fragments using click/slot controls; auto-submit completed one attempt with 100 raw points.
- Memory: all three stages with timeout input and test-only short timings; persisted zero scores, certificate and return to dashboard.
- Calculator: shared login, correct team, variable selection and disabled START while waiting for two offline teammates.
- Admin login; Memory settings changed weight 25→30 with saved/audited confirmation; two members added through named roster controls.
- Mobile login/dashboard at 390×844: stacked cards, expandable navigation and no horizontal page overflow. Viewport override restored.
- Desktop screenshot: dashboard-verification.jpg, explicitly labeled with temporary fixture identities.

## Remaining release checks

Atlas connectivity, Vercel deployment, deployed deep links/CSP, HTTPS Secure cookies, device camera/MediaPipe calibration, full three-camera Calculator play, actual mobile network interruption and event-scale load remain unverified. The application is not presented as deployed or production-certified.


## Latest Fingertip Frenzy browser checks

Verified against the isolated temporary replica-set fixture on ports 5190/5090. Existing application processes on 5173/5000 and the configured database were left untouched.

- Leader-only registration with all five required fields generated a unique FF- code and displayed the team success page.
- Five-field leader login opened the redesigned dashboard.
- A new teammate logged in with the invitation and their own identity; the team roster showed leader and member.
- Dashboard showed round cards in the requested order, with later rounds locked after API restart loaded the progression gate.
- Landing-page round preview changed from Image Formation to Detective Case through its button.
- Administrator login opened standings with exactly five navigation sections: leaderboard and four games.
- Number Memory weight changed from 25 to 26, saved with audit confirmation, then restored to 25. Puzzle page exposed its library and server image-cropping workflow.
- Mobile landing and registration at 390×844 had equal viewport and document widths (375 CSS pixels excluding the scrollbar), with no horizontal overflow.
- Saved screenshots: fingertip-frenzy-desktop.jpg, fingertip-frenzy-mobile.jpg, registration-verification.jpg, dashboard-verification.jpg and admin-verification.jpg. All identities and content shown are disposable test fixtures.
- Temporary viewport overrides were reset and owned preview processes were stopped after verification.

The final ordered-round test run passed all 17 checks, with zero failures, skips or cancellations. Live production deployment and physical camera verification remain the release checks listed above.


## Vercel services and administrator management

Verified using official Vercel CLI 62.5.0 with bundled Node 24.19.0 and `vercel dev -L --listen 127.0.0.1:5290`. Local-only mode detected exactly two services without linking or deploying an account project. The isolated replica-set fixture supplied the backend database.

- Shared routing returned JSON from /api/health, HTML from /register and both game frames, and 404 for an unknown API endpoint.
- SVG and Vite JavaScript modules had correct MIME types after excluding static/dev paths from the SPA rewrite.
- Browser registration generated a unique code; first-login participant enrollment worked through the shared domain.
- Administrator edited a participant identity and transferred team leadership through the embedded leaderboard controls. The team editor displayed the fixed registered name without a name input.
- Screenshot admin-team-management.jpg contains disposable test identities. UI deletion safeguards were exercised through the twelve integration checks rather than deleting live records.
- Latest automated run: 18 tests passed, zero failures/skips. Production deployment, cloud Atlas connectivity, deployed security headers and physical cameras remain unverified.

The active call graph needs no service bindings: frontend browser code calls public /api; backend engines are local imports, and MongoDB is an external database. The four suggested legacy services are excluded pending user confirmation of the proposed service layout.


## Current deployment-log and score-privacy repair

The supplied deployment error was npm EUSAGE from `npm ci --prefix ..`, plus an informational warning about the unused root api/ folder in services mode. An isolated source copy without .env, docs, tests or existing dependencies successfully installed from both service directories after removing the parent-prefix override. The isolated backend build and initial frontend build passed. During repair, new commits changed the actual repository back to a single-project Vercel layout with npm ci, root build, frontend/dist and api/index.js; the latest single-project layout is retained unless the user selects services. Its install command explicitly includes build dependencies, and the SPA fallback excludes file extensions.

Score privacy now requires administrator authentication for all global standings/export paths and derives `/api/teams/me/score` from active authenticated membership. The participant dashboard/team page render only that scoped result. A new integration check covers anonymous and participant denial, own-team scores, ignored query manipulation, separate teams, missing rank data and admin filters. Previous aggregation tests now use administrator cookies.

These latest privacy edits have not been executed through tests/build/lint. Automatic approval review rejected the final verification command because the account usage limit prevented review; it explicitly reported no determination that the command was unsafe. The working checkout dependencies were restored successfully after a Windows native-file lock during installation. A new cloud deployment has not been verified.


## Restored services configuration — final local verification

The next supplied cloud log explicitly reported a framework mismatch: the Vercel project was set to services but the committed config had no services. Restored backend (Express, src/app.js) and frontend (Vite, dist) under the top-level services object. Install/build/output/function settings are scoped per service. Public /api rewrites target backend and the final catch-all targets frontend. The unused root api/ folder is excluded again. Deployment docs now instruct keeping the dashboard framework at Services and project root at the repository root.

Verification after these changes: npm run build passed (1,610 frontend modules plus backend syntax), npm run lint passed with zero warnings/errors, npm test passed all 19 checks with zero failures/skips, including score privacy and team/member management. JSON structure checks verified declared service roots and absence of forbidden top-level build/runtime keys. npm dependency restoration did not change package-lock.json. No cloud redeployment was performed; redeploy the commit containing this restored config.
