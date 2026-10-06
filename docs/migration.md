# Migration safety

The uploaded folders remain intact. Do not run their legacy servers alongside the unified platform against the same production data.

## Memory JSON

`npm run migrate` reads `Number-Memory-Game-main/data/database.json` and reports counts only. It does not print phone numbers, passwords or original records. `npm run migrate -- path/to/export.json` reads another Memory-shaped JSON export.

The script validates registered names, roll numbers and required ten-digit Indian phone numbers. Legacy rows with absent/invalid phones or email need organizer correction. The platform cannot safely invent credentials for those accounts. Conflicts in target roll/phone/team identity abort the transaction. Only after a target backup and successful dry run use `--apply`.

The applied migration creates common users and teams, generates new Aarohan team codes and preserves a code mapping in audit records. Legacy admin credentials are not imported. Original scores remain in the unchanged source JSON. Review them before making manual official score entries or corrections because the original API did not validate them authoritatively.

## Calculator SQL and Vortex MongoDB

Production connection details and database exports were not supplied. Export and back up the old databases first. Resolve duplicated students by roll number and phone number, and decide which common team each student belongs to. Use `scripts/import-students.mjs` for normalized student registrations. Calculator requires exactly three members to assign X/Y/Z; a larger platform team cannot enter it.

Vortex's game content can be converted to the shapes in `docs/game-content.md`. Preserve puzzle order, exact crop URLs and opaque piece IDs. Detective question answer indices and hint penalties are server-only fields. Importing the original bundled case is supported by `scripts/import-original-case.mjs`; live database cases require an exported dataset.

There is no automatic destructive SQL/MongoDB merge, no automatic trust of old scores, and no default import of legacy administrators. Active sessions should finish in the old system or be explicitly reset before cutover. Migration of private live database data remains an organizer-managed step until exports and matching rules are available.
