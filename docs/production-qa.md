# Production QA audit — 8 October 2026

## Result

16 issues found and fixed: **0 Critical, 5 High, 10 Medium, 1 Low**. All 60 regression tests pass, compared with 50 at baseline. No known unresolved Critical or High issue was found in the tested scope. This is a locally verified release candidate, not a certification of the live deployment or physical gesture accuracy.

## Baseline (before application changes)

The existing 50 tests pass. `npm audit --json` reports zero vulnerabilities. Browser testing uses disposable MongoDB data at ports 5091/5191, independent of the running development site and Atlas. The active application is the root Express backend and React frontend; archived source projects are excluded from deployment.

## Bug register (recorded before fixes)

| ID    | Category / severity          | Location                         | Problem and reproduction                                                                  | Expected / actual                                                                                          | Root cause / required fix                                                                                  |
| ----- | ---------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| QA-01 | Scoring / High               | Detective hint and answer routes | Buy a hint at zero, then answer correctly.                                                | Hint cost must reduce eventual points; currently the cost disappears.                                      | Incremental score clamping discards unpaid penalties. Recalculate earned points minus all purchased hints. |
| QA-02 | Isolation / High             | Memory session lookup            | Complete Memory, transfer a participant to another team, open Memory.                     | Each team has independent attempts; currently old team state follows the participant.                      | Scope contains only user ID. Include team and user, preserving same-team legacy attempts.                  |
| QA-03 | Game integrity / High        | Puzzle image crop                | Sort generated tile asset URLs.                                                           | URLs must not reveal tile solution; sequential ObjectIds reproduce row-major order.                        | Randomize asset identifiers independently of crop order.                                                   |
| QA-04 | Data consistency / Medium    | CSV exports and admin links      | Export page 2 or filtered standings.                                                      | Export must match displayed page/filter; currently API forces 100 rows and drops filters.                  | Share pagination/filter semantics and carry query parameters in links.                                     |
| QA-05 | Content validation / Medium  | Detective schema/editor          | Save duplicate clue IDs or nonexistent clue/question references.                          | Reject invalid references; currently accepted, causing missing/mislinked evidence.                         | Validate relationships; clear question links when a clue is removed.                                       |
| QA-06 | Schedule validation / Medium | Admin game settings              | Submit equal start/end instants with different fractional-second formatting.              | Reject nonpositive window; string comparison can accept it.                                                | Compare parsed timestamps.                                                                                 |
| QA-07 | State lifecycle / Medium     | Detective case GET               | Read the case without a started attempt.                                                  | Reading should not consume an attempt or start a timer; currently GET starts one.                          | Add explicit POST start and update arena entry.                                                            |
| QA-08 | Ranking / High               | Leaderboard settings             | Store a partial legacy Memory configuration without weight and score a completed attempt. | Finite normalized total; API currently serializes the total as null.                                       | Apply the default weight when the stored weight is absent or invalid.                                      |
| QA-09 | UI state / Medium            | Team roster editor               | Add, remove, and re-add the same available participant.                                   | One member row and leader option; the added list duplicates the row.                                       | Deduplicate displayed members by identity and prevent editing when team loading fails.                     |
| QA-10 | UI refresh / Low             | Leaderboard                      | Wait for the thirty-second background refresh.                                            | Keep the current table visible; it is cleared while reloading.                                             | Use the resource hook's non-destructive periodic refresh.                                                  |
| QA-11 | UI / Medium                  | Detective answer radios          | Focus an answer and resize the arena.                                                     | Content remains aligned; an invisible radio is viewport-wide and scrolls the hidden container sideways.    | Scope the visually hidden input dimensions and position it within its label.                               |
| QA-12 | Accessibility / Medium       | Detective hint confirmation      | Open the hint prompt and press Tab/Escape; configure a zero-cost hint.                    | Focus stays in the dialog, Escape cancels, free hints show zero cost.                                      | Replace a generic overlay with a native modal dialog; use nullish penalty defaults.                        |
| QA-13 | Responsive UI / Medium       | Puzzle arena                     | Play at 390×844 with the tray and auto-submit control visible.                            | Clear/Submit buttons remain reachable; currently they extend below a card with hidden overflow.            | Size the board from remaining grid space and allow internal scrolling at short heights.                    |
| QA-14 | Camera lifecycle / High      | Both gesture arenas              | Leave camera permission pending, or stall the tracker initialization.                     | Startup must end with retry feedback without consuming a Memory stage; currently it can wait indefinitely. | Bound camera/video/tracker startup; stop streams or trackers that resolve after timeout.                   |

| QA-15 | Accessibility / Medium | Mobile navigation | Closed sidebar links remain keyboard-accessible; Escape does not dismiss it. | Closed links cannot receive focus; Escape returns focus to the toggle. | Transform-only hiding and missing keyboard handling. Add visibility and dismissal/focus handling. |
| QA-16 | UI / Medium | Puzzle timer progress | Reload an attempt with 25 of 30 minutes remaining. | Countdown and progress must preserve elapsed time; progress resets to 100%. | Denominator uses remaining time. Derive total duration from persisted start/end timestamps. |

## Architecture and audit scope

React/Vite pages and original game arenas call same-origin Express APIs through the root `api/index.js` entrypoint. MongoDB/Mongoose stores identities, sessions, team membership, content, game attempts, presence leases, results, settings, image tiles and audit records. Authentication uses server sessions and cookies; role and ownership checks protect administrative and team data. Calculator presence and digits are shared database state rather than per-function process memory. MediaPipe camera tracking runs in the browser and requires its external model/CDN assets.

The active deployment is the current root Vercel configuration, with `/api/*` routed to Express and frontend routes to the built SPA. Archived game projects are excluded by `.vercelignore`. The deployment needs the repository root and Framework Other settings documented in `deployment.md`; old Services project settings are incompatible with this current configuration.

## Verification evidence

| Issues | Verification and outcome                                                                                                                                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-01  | Regression buys a hint at zero and then answers correctly; the penalty remains deducted. Passed.                                                                                                                             |
| QA-02  | Regression changes team ownership and checks both new-team isolation and same-team legacy attempts. Passed.                                                                                                                  |
| QA-03  | Upload regression checks unpredictable asset IDs. Migration tests verify preserved bytes/answers, default dry-run, active-play refusal and repeat-run safety. Passed.                                                        |
| QA-04  | API regressions verify page/search/game/deleted-record filters; admin export links inspected against their active query. Passed.                                                                                             |
| QA-05  | Invalid clue/hint relationship regressions reject malformed content; browser editor shows required question/option controls. Passed.                                                                                         |
| QA-06  | Equal instants with differently formatted milliseconds are rejected. Passed.                                                                                                                                                 |
| QA-07  | GET regressions prove no attempt creation, presence renewal or persisted expiry result; explicit POST sync finalizes once. Passed.                                                                                           |
| QA-08  | A partial legacy Memory configuration still produces a finite leaderboard total. Passed.                                                                                                                                     |
| QA-09  | Roster deduplication and load-error recovery reviewed in source; ordinary team editing exercised in browser and backend roster/revocation regressions pass. The exact add/remove/re-add gesture was not replayed in browser. |
| QA-10  | Background refresh uses the resource hook's existing-data refresh path; leaderboard loaded and resized in browser. The thirty-second transition was source-reviewed rather than separately timed.                            |
| QA-11  | Browser confirms the hidden radio is 1px wide and the Detective main container no longer overflows after resizing/focus. Passed.                                                                                             |
| QA-12  | Browser verifies dialog initial focus, Escape cancellation and purchased hint changing score from 100 to 80; zero-cost fallback inspected. Passed.                                                                           |
| QA-13  | Browser reproduces clipping at 390×844, then verifies buttons fit after the fix; 320×740 student play, clear, hint and history also work. Passed.                                                                            |
| QA-14  | VM regression covers timeout, late stream/track disposal and retry. Browser records the expected permission-timeout recovery instead of waiting forever. Actual camera inference requires a permitted device.                |
| QA-15  | Browser verifies closed mobile links disappear from accessibility navigation and Escape restores toggle focus. Passed.                                                                                                       |
| QA-16  | Fresh-tab reload retains a 23:59 countdown with an 80% progress bar for the original 30-minute attempt. Passed; fresh-tab console contains no warnings/errors.                                                               |

## Functional coverage

The 60-test suite exercises registration and unique team codes; normalized five-field student login; invalid admin passwords/hashes; login/logout/expiry and stale-request races; shared-Wi-Fi limits; team capacity races; identity and roster editing; immutable team names; revoked accounts; automatic round unlocking; per-team scores and admin-only standings; reset scopes; content validation; schedules; CSV pagination; server scoring; replay and repeated-submission guards; missing content and partial settings; database failures and reconnects; safe diagnostics; and isolated untimed admin practice.

Calculator tests use three independent authenticated sessions and concurrent digit writes, verify retained digits and common state, reject stale writes, and exercise offline recovery and timer accounting. Memory tests verify all three stages, server-owned sequences, positional scoring, no-repeat digits, camera readiness before consuming time, gesture-only answering and untimed admin practice. These are API/VM tests, not a three-physical-camera trial.

Browser flows include invalid and valid admin login, admin Memory controls and settings save, Detective question editing, team roster display, private admin practice, actual Detective answers and hints, Puzzle submission/incorrect feedback/clear/hint/history/refresh, Calculator role/start controls, Memory briefing and permission failure, student private scores, direct unauthorized admin navigation, profile/team pages, mobile navigation, registration validation and unique code creation, wrong-email login and successful student login.

## Responsive and visual checks

Widths tested: **320, 375, 390, 414, 768, 1024, 1280, 1440 and 1920 pixels**, generally at height 900; additionally 390×844 and 320×740 for mobile play. Landing, student dashboard, admin leaderboard, Detective editor, Puzzle and Detective arenas, and Calculator/Memory iframe layouts were measured across all nine widths. Their page widths did not overflow; game frames fit their allocated viewport. Tables retain intentional internal horizontal scrolling. The mobile Puzzle action clipping was repaired and retested.

This does not claim every page at every height or every physical browser. Profile/registration/login received interactive flow checks, rather than a separate nine-width measurement matrix. Memory camera/answering visuals still need physical-device confirmation.

Visual proof: [Detective clues and purchased hint](detective-qa-verification.png), [mobile Puzzle controls](puzzle-mobile-qa.png).

## Build, database and security checks

- All **60/60** tests pass, none skipped. Test databases are disposable local MongoDB replica sets.
- Production Vite build and backend/script syntax checks pass. Oxlint reports **0 warnings, 0 errors**.
- Fresh workspace install using the configured Vercel install command succeeds; `cookie-parser` and `sharp` load successfully. Install audit reports **0 vulnerabilities**. This was Windows, not Vercel's Linux packaging runtime.
- Existing configured database passes a **read-only connection and transaction-support check**. No production database record was changed.
- The safe puzzle-asset audit reports **0 legacy puzzles, 0 active competition attempts** in the configured database. Other deployments can use the documented dry-run-first migration.
- No private environment file is tracked. TLS validation was not bypassed. Existing same-origin checks, secure production cookies, authorization, content-security and camera policies remain enabled.
- Main bundle is approximately 343 KB / 105 KB gzip; game pages are split into separate chunks. Camera startup now has deadlines and late-resource cleanup. Physical-device latency, concurrent load capacity and CDN cold-start behavior were not benchmarked.

## Readiness by subsystem

| Subsystem      | Status                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Frontend       | Production build and tested browser flows pass; real camera-device verification remains.                                          |
| Backend        | Integration, concurrency, ownership, validation and failure-path tests pass.                                                      |
| Database       | Local transaction tests and configured database read-only connectivity pass; deployment network access must be checked on Vercel. |
| Authentication | Student/admin login, logout, expiry, invalid input and stale-response regressions pass.                                           |
| Authorization  | Admin-only standings, own-team scores, leader operations and account revocation pass.                                             |
| UI/UX          | Tested navigation, clues, dialogs, roster recovery and Puzzle action layout corrected; camera output needs device confirmation.   |
| Responsive     | Nine-width measurements pass for the listed families; physical mobile browser testing remains.                                    |
| Security       | Isolation and puzzle-answer leakage repaired; zero dependency advisories; no complete penetration-test claim.                     |
| Performance    | Sync/gesture concurrency and bounded startup checked; real-device latency and load testing remain.                                |
| Build          | Clean install, production build, syntax and lint pass.                                                                            |
| Deployment     | Repository configuration reviewed; no live Vercel deployment or production smoke test performed in this audit.                    |

## Release limitations and next verification

Deploy frontend and backend together: arena clients now use explicit POST start/sync endpoints; GET state requests no longer consume attempts, renew presence or persist expired results. Existing completed scores are not retroactively rewritten, and asset migration never changes historical attempt snapshots.

Before calling the live site production-ready, verify its actual project root/framework, Production environment variables, HTTPS cookie/origin behavior, Atlas access from Vercel and deployed camera CSP/CDN access. Run three real team devices through Calculator with permissions allowed, temporary disconnection/reconnection and hand loss; confirm shared digits, pause/resume, gesture accuracy and latency. Run Memory on actual mobile/desktop cameras through all stages. Those require a running deployment and permitted hardware, which this local browser session cannot certify.

No git push, deployment, production credential change or production data write was performed. The report distinguishes runtime/browser tests from source-reviewed changes and does not assert that every possible bug has been eliminated.
