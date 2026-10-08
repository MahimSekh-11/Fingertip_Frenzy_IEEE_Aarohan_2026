# UI and game audit — 2026-10-07

## Changes

- Admin forms show required field indicators and guidance. Puzzle creation uses image upload instead of saving an incomplete manual tile record.
- Detective questions use separate answer-option inputs, enforce 2–10 nonblank options and a valid correct answer, and preserve answer indexes when options are removed. Deleted question hints become global hints. The API rejects whitespace-only question/option values.
- Navigation CSS applies only to the workspace sidebar. Puzzle Attempt History stays beside the board on desktop and stacks on mobile. Detective evidence/questions stack on narrow screens. Shared forms, buttons and practice controls wrap responsively.
- Every game settings page links to admin test mode. The server assigns private admin scopes and bypasses event scheduling/round gates for admin practice. Practice creates no competition Result or Team records and is excluded from participation/session statistics. Reset affects only the current administrator's test attempt.
- Calculator practice can simulate X/Y/Z and digits without three devices. Competition presence/role restrictions remain enforced. Stale digit samples from a previous question are ignored.
- Number Memory's same-origin adapter recognizes administrators without requiring a registered team. The test attempt can be restarted from the parent practice controls.
- Reset participant attempts no longer reopen abandoned sessions; Calculator creates a fresh retry. Resource loads clear stale page data, API parsing errors have readable messages, podium scores refresh alongside standings, and profiles show a loading/error state instead of an incorrect temporary team status.

## Verification

- Node 24: 25 automated tests passed, including all four admin game completions, unchanged competition standings, private test scopes, participant access restrictions, reset retries and blank Detective options.
- `npm run lint`: zero warnings/errors. `npm run build`: frontend production bundle and backend checks passed.
- Browser QA used an isolated temporary MongoDB replica set, disposable identities and localhost API/Vite servers. No competition data was changed.
- Browser verified registration and generated code, five-field participant login, own-team scores, profile, mobile navigation, admin login, Detective case/question draft saving, Puzzle history placement at desktop/mobile sizes, solo Calculator test controls and a fresh Number Memory stage briefing.
- Screenshot: `puzzle-history-verification.jpg`.
- Existing files in the three original game source directories match their baseline hashes. The baseline lists `vortex-main/client/src/config/firebase.js`, which was already absent and was not recreated.

## Remaining external verification

Push these changes and redeploy to publish them. Production Vercel/Atlas connectivity was not changed or revalidated during this UI audit. Camera permissions, physical gesture recognition and multiple real participant devices require device testing; automated tests verify the server state and score rules.

## Game entrance and viewport follow-up

- Saved partial game settings now inherit missing defaults. Memory controls receive all three stages; invalid date fields render safely. Admin navigation discards settings from the previous game, and a page boundary provides a recovery screen for unexpected rendering failures.
- Game cards and game entry use the same availability rules and show paused, future, closed or invalid-schedule reasons. Organizer restrictions and required round order remain enforced. Partial saved settings no longer accidentally mark otherwise enabled games unavailable.
- Embedded assets moved from `frontend/public/games` to `frontend/public/game-assets` to avoid collisions with SPA routes. Iframe paths and Vercel rewrites/CSP use the new path together.
- Game pages use a viewport-height arena layout. Puzzle history stays beside the board on desktop and beneath it on mobile. Detective answers use keyboard-accessible radio inputs. Calculator and Memory place camera input at the right, with detected output nearby. Long evidence, logs and history may scroll inside their panels; the arena page itself does not scroll at the tested sizes.
- Calculator starts its camera preview without waiting for game state or the hand model. Memory prepares its camera before starting the server countdown and reuses the hand engine across stages. Streams stop on leaving a game. Missing hand input no longer submits an accidental zero. Model/device/permission failures have recovery messages; initial permission prompts and model downloads still depend on the device and connection.
- Interrupted Memory attempts show only their recovery message, without a misleading default stage briefing. The organizer must reset interrupted competition attempts through the existing controls.

Follow-up verification: all 28 Node 24 tests passed, including a partial Memory configuration/admin-controls/student-entry regression. Lint and production build passed. Browser checks used only a disposable MongoDB replica set, test identities and localhost servers: student entry into all four games, Memory controls switching/saving, desktop/laptop/mobile Puzzle and Detective layouts, and camera preview/Memory preparation. At 390×844, Puzzle controls end at 721px and history at 837px, with document scroll height 844px; Calculator's iframe height and scroll height both measure 714px. Laptop Puzzle proof: `student-puzzle-fit.jpg`. A fresh valid Memory control page did not reproduce the reported production crash; the changes address observed stale/partial-settings failure paths rather than an unavailable production stack trace.

## Dedicated full-screen arena layout

All four game routes now replace the dashboard sidebar/footer with a compact arena bar containing the round, game title, participant identity, exit link and optional browser full-screen toggle. Returning to games restores the normal workspace. Native full-screen entry and exit were verified in the local browser. Admin practice tools are collapsible; game rules, saved scores and access restrictions are unchanged.

Puzzle uses a larger board beside its tile tray/actions, with history in a separate panel; mobile stacks the panels. Detective presents evidence and answers in separate columns on desktop. Calculator and Memory share deeper navy panels, clear cyan accents, camera/output sections and visible focus states. Calculator reserves space above its mobile content for the camera; Memory briefing/result cards use flex layout for centered content.

Browser verification: 1440×900, 1280×720 and 390×844. Puzzle page scroll height matches the viewport; at mobile size, actions end at 750px and history at 836px. Detective mobile submit ends at 715px. Calculator camera is top-right at desktop/mobile sizes, and iframe height equals scroll height (626px/769px respectively). Memory mobile start is visible at 597px inside its 769px frame. Screenshots: `fullscreen-memory-arena.jpg`, `fullscreen-detective-arena.jpg`. Lint, embedded Memory syntax check and production build passed. QA used only disposable local fixtures; production deployment is still required.

## Student entry, gesture-only Memory and light theme

- Read-only checks found the configured Atlas database connected and transaction-capable, with Puzzle enabled and one published puzzle. Detective had no published case. The public Vercel readiness endpoint also returned connected. The old generic Puzzle availability wording is absent from current source, so an older running deployment is a possible cause; current public student sessions were not impersonated. The user chose to publish their own existing Detective draft through admin controls.
- Game cards now identify unpublished content. Missing or malformed published case/puzzle data returns a 409 organizer message instead of a TypeError/503. Detective separates service failure from access restriction and offers retry for transient connection failures. Competition scheduling and round order remain enforced.
- Memory accepts only hand gestures in its normal interface: keyboard listener/manual digit button removed. Camera/tracker readiness is required before allocating a stage and starting the server clock. Reloading a briefing before preparation no longer marks a stage interrupted. Tests verify camera refusal cannot start the server clock and answering installs no keyboard handler. Client gesture detection is not a server-verifiable anti-cheat attestation.
- Added a light portal theme and separate light palettes for embedded Calculator/Memory: white panels, pale blue backgrounds, blue actions and teal accents. Puzzle board sizing follows available container height to prevent overlapping headings.
- All 31 tests passed on Node 24, including missing/malformed content and gesture-only UI regressions. Lint and production build passed. Browser verified student Puzzle start, Detective entry, mobile document fit and Memory briefing/reload using only disposable fixtures. Screenshot: `light-detective-arena.jpg`. Production game content/scores were not changed.

Publish the intended Detective draft and deploy the updated repository. For local use, restart the backend and frontend so the current code runs.

## Automatic scoring, round progression and untimed practice

- Removed manual score correction and validity toggles from admin results and refused the legacy PATCH endpoint (405). Completion creates an automatically valid result; admin reset excludes only the selected attempt and grants a retry.
- Results provide team reset actions and Memory participant reset actions. Existing attempt controls also support unfinished attempts.
- Verified Puzzle -> Detective -> Calculator -> Memory unlock automatically for team members. Dashboard availability refreshes every five seconds without blanking the screen; completion pages provide a next-round link.
- All four admin practice games ignore answer deadlines, including old attempts with an expired stored clock. Calculator starts practice immediately and awards no time bonus. Memory still shows its sequence at the configured cadence and accepts gestures only, with unlimited answer time in practice. Private attempts never create competition results.
- Added navy navigation and arena headers to the light blue/teal theme. Puzzle controls fit desktop 1280x720 and mobile 390x844 / 390x650; narrow short screens compact their spacing. Explicit grid rows prevent rectangular puzzle configurations from growing beyond the board.
- Browser verified tile placement, practice restart, infinity timer, and visible controls/history. Screenshot: `docs/puzzle-untimed-practice.jpg` (isolated fixture; no production team data).
- Production data and organizer content were not changed. Deployment is still required to apply the code to Vercel.

## Restored dark theme and Detective evidence visibility

- Restored the original deep navy theme by removing the light CSS import and light overrides in the Calculator and Memory stylesheets. Automatic scoring, resets, unlocks and untimed practice remain in place.
- Detective now provides a labelled clue navigation strip, preserves the question-linked clue by default, and lets players browse all evidence without changing the active question or spending hint points.
- Restored readable evidence contrast, rendered image clues with contain sizing, and added guidance for empty clue content. Evidence and question panels scroll independently when their content exceeds the arena.
- Browser verified document, text and loaded image exhibits at 1280x720. At 390x844, navigation stays horizontal, clue descriptions remain visible, evidence can be scrolled within its panel, and the outer page does not overflow.
- Proof: `docs/dark-detective-clues.jpg` uses the isolated preview fixture. No production content was published or changed.

## Dedicated Detective clue reader

- Read-only diagnostics confirmed the configured published case and its active attempt both contain a nonempty text clue; no database records were modified.
- Extracted evidence into a shared panel with its own visible exhibit viewport. Metadata no longer pushes the clue body out of the mobile panel, and the description follows the actual evidence.
- Added View clues to open an accessible native dialog with focus trapping, a close control, and enough room to read all evidence. Switching clues updates both views without submitting an answer or charging a hint penalty. Image failures show an explanation and a full-size link.
- Browser verified inline exhibit visibility at 390x844, opening the full reader, switching to a different text clue, and closing it. Proof: `docs/detective-clue-reader.jpg` (isolated fixture).
- Lint and frontend/backend production builds passed. The deployed website requires a new deployment to receive these changes.
