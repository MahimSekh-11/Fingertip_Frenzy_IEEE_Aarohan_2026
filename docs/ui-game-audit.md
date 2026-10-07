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
