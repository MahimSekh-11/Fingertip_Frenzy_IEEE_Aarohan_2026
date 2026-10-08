# Source audit and architecture decision

The workspace contains three uploaded projects and four playable games. The fourth game is Detective Case inside Vortex, alongside Vortex Puzzle. Originals remain in their uploaded directories. `docs/source-inventory.json` records the source files and SHA-256 fingerprints used for this integration.

| Source | Frontend | Backend / persistence | Identity | Games / administration |
|---|---|---|---|---|
| IEEE_EVENT_MATH-main | Single HTML page, inline CSS/module JS, on-device MediaPipe | FastAPI, asyncio tick loop, WebSocket, SQLAlchemy PostgreSQL or SQLite, in-memory live teams | Per-game player JWT, roll/name/phone matching, separate admin password/JWT | Calculator: X/Y/Z role assignment, three online players, pause/resume, 20 questions, question generation and server scoring; settings, force-next, end game, team deletion, audience, CSV/PDF |
| Number-Memory-Game-main | DOM classes, CSS, MediaPipe, Web Audio | aiohttp REST/WebSocket, JSON file, process-local lock | Team create/join, localStorage participant records; static admin token, plaintext default admin password | Three unique-digit stages; position matches award 1 point; stage tuning, player reset, team deletion, CSV |
| vortex-main | React/Vite, React Router, Tailwind/custom CSS, Lucide | Express, Mongoose, Socket.IO, disk/memory fallback, Cloudinary/Sharp | Firebase Google identity plus HTTP-only JWT and development bypass | Puzzle grid reconstruction and Detective MCQs/clues/hints; rounds, qualification, content, scores, team/student moderation, audit and leaderboard freeze |

## Game rules and original score ranges

- Calculator: original template lists and number constraints retained; digits 0–9; easy/medium/hard timers 40/60/80 seconds; six easy, six medium, eight hard questions; 100 base points plus twice remaining seconds; no penalty for wrong combinations; one-second stable combination; three assigned roles; leader starts and the timer pauses when a participant is absent. Default theoretical maximum: 4,480. The JavaScript engine ports the original state transitions to persisted, request-driven state. The random source changes from Python's seeded random generator to Node cryptographic randomness; the allowed solution counts and templates remain.
- Memory: stages 5/8/9 unique digits drawn from 1–9; display intervals 3/2/1.5 seconds; response intervals 5/4/3 seconds; 1 point per exact position; maximum 22 per player. The implementation (rather than older README claims) uses a one-second correct gesture hold and 420/280 ms feedback delays; those are retained in the copied UI.
- Puzzle: server-owned piece order, every piece once, points per solved puzzle, sequential unlock and team leader control; team round deadline retained. Incorrect layouts do not earn points. The common platform has no elimination requirement between the four games.
- Detective: server-owned MCQ answer indices, points per question, sequential question progress, one team attempt, hint penalties floor the score at zero, case timeout. The original service allowed repeat/out-of-order question IDs; the adapter rejects them. Puzzle qualification gating is replaced with common active-team access to satisfy four independent assessments.

## Source findings and conflicts

- Three independent authentication and team systems; Calculator and Memory permit phone omission, whereas the requested common login requires a registered unique phone.
- Separate SQL, JSON and MongoDB persistence. Existing Memory JSON contains saved records. No production database access or credentials were supplied. Legacy scores cannot be automatically trusted because Memory accepted arbitrary score and sequence payloads.
- Calculator depends on continuously running asyncio tasks and live socket presence. Vortex uses Socket.IO broadcasts and an interval. Memory writes files. Those assumptions do not belong in stateless deployment handlers.
- Vortex's MongoDB connector swallows connection failures, and multiple store operations fall back to file/memory. The common backend instead fails closed with HTTP 503.
- Original frontend paths include `/api/*`, `/api/v1/*`, `/game`, `/detective`, `/rounds` and hash routes. The platform preserves the Vortex game API contract beneath `/api/v1` while implementing common routes beneath `/api`.
- Ports were 8000 (Calculator), 3000 (Memory), 5000 (Vortex API), 5173 (Vite). New development uses only 5000 and 5173 with a frontend proxy.
- React/Vite dependencies in the upload require a newer runtime than the available Node 20.15. The new workspace uses Vite 6 and React 19 with one lockfile, rather than blindly upgrading all original projects.
- Firebase, three JWT systems, SQL credentials, Cloudinary secrets, default admin passwords and disk paths are replaced by central session records and `MONGODB_URI`. Existing project environment examples remain historical.
- Calculator and Memory style global HTML/body and rely heavily on DOM IDs. Same-origin frames isolate them with no token transfer or cross-origin messages. Puzzle and Detective are integrated directly with prefixed original Vortex CSS. Platform styles use their own namespace.

## Final structure

`frontend/` owns routes, shared UI, student/admin pages, two retained React game pages, assets and two isolated DOM game bundles. `backend/src/` owns MongoDB models, security middleware, validation, transactional services, game engines and routes. `api/index.js` is the Vercel handler. `scripts/` owns bootstrap, input import, non-destructive migration, development verification and checks. `docs/` explains architecture, deployment and content.

No uploaded source file was removed. The new application does not mount the legacy servers or their authentication/admin endpoints. Legacy files are preserved for migration and comparison, not included as active platform APIs.

## Transport tradeoff

The platform uses persisted deadlines and bounded polling instead of depending on socket connection affinity or a background timer. Calculator presence has a five-second lease refreshed by one-second requests, so disconnect detection differs from immediate WebSocket closure by at most the lease interval. State advances when a player requests it; results are finalized through transactional requests. Vercel's current WebSocket support has evolved, but this implementation requires only ordinary HTTP functions and MongoDB.

## Security boundary

Roll plus phone authenticates against organizer-provisioned records; there is no SMS verification, as requested. Anyone who knows both identifiers can log in. Gesture recognition remains browser-side, so the backend can validate answers, sequences, timing and scores but cannot attest that a real hand was used. Event supervision remains necessary. Production testing must include camera permissions, gesture calibration and reconnect behavior on actual participant devices.
