# Local-first workout freedom

## Objective

Make training data local-first, allow independent repeated exercise blocks, keep unfinished workouts resumable, support reversible set changes, and scaffold offline exercise media.

## Problem and why

Exercise creation currently waits on Firestore, exercise occurrences are identified only by exercise ID, active workouts trap navigation behind a destructive discard action, and exercises have no instructional media or device-local machine photo.

## Authorized scope

- Work directly on the local `main` branch.
- Create separate Conventional Commit work units with tests and documentation beside behavior.
- Do not push, open a pull request, or merge remotely.
- Preserve compatibility with existing Firestore data, backups, and workout drafts.

## Constraints

- React 19, strict TypeScript, Tailwind, Vitest, native browser APIs, no new dependency unless unavoidable.
- Strict TDD: RED -> GREEN -> REFACTOR.
- Mobile-first validation at 375x667 and 390x844, then desktop.
- Exercise GIF assets are supplied later; implementation must use `/exercise-media/{exerciseId}.gif` with a graceful placeholder.
- Machine photos remain device-local and are excluded from Firebase and JSON backups.

## Delivery

- Forecast: substantially above 400 authored changed lines across the complete feature.
- Strategy: `ask-on-risk`; remote PR/chain selection deferred until the user authorizes remote delivery.
- Local commits remain individually revertible and are the delivery boundaries for this session.
- RDD review boundary: each completed work-unit commit, subject to the configured review mode.

## TDD

- Mode: enabled by project instructions.
- Runner: `npm test -- --run`.
- Per task: record observed RED, GREEN, full checks, runtime scenario, rollback boundary, and commit ID.

## Tasks

- [x] LF-01 Add stable exercise block IDs and backward-compatible migration.
  - Route: delegated; touches domain types, serializers, services, UI consumers, and tests.
  - Acceptance: old data normalizes; all block lists use `blockId`; no visible behavior changes.
- [x] LF-02 Support independent exercise blocks in routine editing.
  - Route: delegated; multi-file UI/domain behavior.
  - Acceptance: add/duplicate/edit/replace/remove; replacement preserves block configuration; selected day remains selected.
  - RED: `npm test -- --run src/UI/components/RoutinesScreen.test.tsx` — 35 tests ran; 5 new behavior tests failed before implementation because add/replace/duplicate/remove controls and day-detail edit access did not exist.
  - GREEN: `npm test -- --run src/UI/components/RoutinesScreen.test.tsx` — 1 file, 35 tests passed.
  - Full checks: `npm test -- --run` — 40 files, 226 tests passed; `npm run build` passed; `git diff --check` passed.
  - Runtime: N/A — no browser automation surface was available; the focused integration test explicitly exercised the 375×667 compact viewport and the production build passed.
  - Rollback boundary: revert `b568f94` to remove routine-editor block add/duplicate/replace/remove behavior and selected-day editor retention, without changing the LF-01 identity migration.
  - Commit: `b568f94` (`feat(routines): support independent blocks`).
- [x] LF-03 Support repeated exercise blocks in active and historical workouts.
  - Route: delegated; multi-file domain/UI behavior.
  - Acceptance: duplicate exercise IDs are allowed as independent blocks and remain editable after completion.
  - RED: `npm test -- --run src/domain/WorkoutService.test.ts src/domain/WorkoutEditorService.test.ts src/UI/components/WorkoutScreen.test.tsx src/UI/components/WorkoutHistory.test.tsx` — 4 files, 4 behavior tests failed before implementation because active and completed workouts rejected duplicate exercise IDs.
  - GREEN: `npm test -- --run src/domain/WorkoutService.test.ts src/domain/WorkoutEditorService.test.ts src/UI/components/WorkoutScreen.test.tsx src/UI/components/WorkoutHistory.test.tsx` — 4 files, 19 tests passed.
  - Full checks: `npm test -- --run` — 40 files, 228 tests passed; `npm run build` passed; `git diff --check` passed.
  - Runtime: N/A — no browser automation surface was available; the focused player integration test exercised the 390×844 mobile viewport and the production build passed.
  - Rollback boundary: revert this work-unit commit to restore duplicate blocking in active and historical workout editors without changing LF-01 block-ID migration or LF-02 routine editing.
  - Commit: `HEAD` (`feat(workouts): allow repeated blocks`).
- [ ] LF-04 Add arbitrary set removal with Undo.
  - Route: delegated; domain, hook, and responsive UI behavior.
  - Acceptance: any recorded set can be removed, persisted, and restored during the undo window.
- [ ] LF-05 Allow leaving and resuming an unfinished workout.
  - Route: delegated; routing, draft persistence, and UI behavior.
  - Acceptance: leaving preserves the draft; discarding remains explicit; resume is clearly reachable.
- [ ] LF-06 Add the native IndexedDB training store without activating it.
  - Route: delegated; new infrastructure adapter and tests.
  - Acceptance: transactional CRUD, per-profile isolation, migration primitives, and quota/error handling.
- [ ] LF-07 Add the Firestore synchronization outbox without activating it.
  - Route: delegated; persistence/synchronization infrastructure and tests.
  - Acceptance: queued writes, retries, tombstones, deterministic conflict handling, and status reporting.
- [ ] LF-08 Activate local-first persistence as a dedicated rollback switch.
  - Route: delegated; composition and application data flow.
  - Acceptance: local writes resolve immediately; cloud delay/failure never blocks normal local use; reverting this task's commit restores Firestore-first composition.
- [ ] LF-09 Add exercise GIF resolution and placeholders.
  - Route: delegated; shared responsive UI component and tests.
  - Acceptance: detail and workout use the same component; dropping a correctly named GIF requires no code change.
- [ ] LF-10 Add device-local machine photos.
  - Route: delegated; IndexedDB Blob storage, native image processing, responsive UI, and tests.
  - Acceptance: capture/select, compress, replace, delete, reload; never synced or exported.
- [ ] LF-11 Run final regression and browser validation.
  - Route: delegated verification; tests/build/runtime execution.
  - Acceptance: focused tests, full suite, build, mobile viewports, desktop, and storage/sync failure scenarios are reported honestly.

## Progress and evidence

- Planning and repository mapping complete.
- LF-01 complete: `blockId` now identifies each routine, active-workout, and completed-workout occurrence. Legacy Firestore snapshots, backups, and workout drafts normalize deterministically and preserve distinct duplicate occurrences.
- LF-01 RED: `npm test -- --run src/domain/WorkoutService.test.ts src/application/BackupSerializer.test.ts src/infrastructure/LocalStorageWorkoutDraftRepository.test.ts` initially failed in 2 assertions because completed workouts and imported backups now carry the required `blockId`.
- LF-01 GREEN: `npm test -- --run src/domain/WorkoutService.test.ts src/application/BackupSerializer.test.ts src/infrastructure/LocalStorageWorkoutDraftRepository.test.ts src/infrastructure/FirestoreTrainingRepository.test.ts` — 4 files, 22 tests passed.
- LF-01 full checks: `npm test -- --run` — 40 files, 221 tests passed; `npm run build` passed; `git diff --check` passed.
- LF-01 runtime: N/A — this model/data migration has no isolated browser interaction; the build exercised the production bundle. Existing tests still print pre-existing React key warnings for legacy test fixtures in `RoutinesScreen` and `WorkoutEditorModal`.
- LF-01 rollback boundary: revert this work-unit commit to remove only stable block identities and legacy normalization, restoring the previous exercise-ID-only data shape.
- LF-01 commit: this work-unit commit (recorded in the local Git history).
- LF-02 complete: routine editing now treats each exercise occurrence as an independent block. Replacing preserves the block ID and configuration; repeated exercise IDs are allowed.
- LF-03 complete: active workouts and history can add or replace a repeated exercise ID as an independent block. Each addition gets a distinct block ID; replacement targets only the selected block and preserves its ID and target configuration.
- Next task: LF-04.

## Next step

Implement LF-04 under strict TDD. Do not push, open a pull request, or select a remote chain until the user authorizes remote delivery.
