# Verification record

Locally verified 2026-10-07 (Asia/Calcutta), Windows, Node 20.15 / npm 10.7. Recommend Node 22 LTS for production.

## Commands actually run

- npm ci passed with the regenerated lockfile: 270 packages installed in 25 seconds, no metadata warnings. Preview processes were stopped before installation to release Windows native module locks.
- npm run build passed: 1,610 Vite modules transformed; frontend emitted; backend syntax passed.
- npm run lint passed: zero warnings/errors.
- npm test passed: 17 checks, zero failures/skips.
- Legacy migration dry-run: eight teams require correction; source/target unmodified.
- Original Detective case dry-run validated the bundled case.
- Source SHA-256 comparison: all inventoried original files unchanged.

Syntax checks are not TypeScript type checking.

## Automated coverage

Eleven integration checks use actual Express routes, unique indexes and a real isolated MongoDB replica set. Temporary fixtures never seed production.

1. Leader registration, atomic code creation, duplicate prevention, full five-field login, origin protection, private cookie, authorization, logout and expiration.
2. First-login teammate enrollment, capacity, invalid code, leader-only edits, exact four-round order and rejection of attempts that skip earlier rounds.
3. Memory sequence/timing/order, rejection of client scores and persisted three-stage completion.
4. Puzzle server answers, completion and replay rejection.
5. Detective hidden answers/hints, sequential questions, replay rejection and hint penalties.
6. Calculator shared state, original valid equation and persisted result.
7. Four-game standings, score correction limits/audit, rename and admin sections.
8. Simultaneous joins at capacity: one success, one conflict; roster remains valid.
9. Multi-team search/rank/pagination and Memory ratios across different maximum snapshots.
10. Upload authorization, malformed images, real Sharp crops, retrieved image bytes and audited draft.
11. Scoped reset invalidates result and grants only its player a retry.

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
