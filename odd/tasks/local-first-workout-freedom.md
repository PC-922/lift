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
- [x] LF-04 Add arbitrary set removal with Undo.
  - Route: delegated; domain, hook, and responsive UI behavior.
  - Acceptance: any recorded set can be removed, persisted, and restored during the undo window.
  - RED: `npm test -- --run src/domain/WorkoutService.test.ts src/UI/hooks/useWorkoutSession.test.tsx src/UI/components/WorkoutScreen.test.tsx` — 3 files, 4 new behavior tests failed because `removeSet`, restoration APIs, and accessible player controls did not exist.
  - GREEN: `npm test -- --run src/domain/WorkoutService.test.ts src/UI/hooks/useWorkoutSession.test.tsx src/UI/components/WorkoutScreen.test.tsx` — 3 files, 30 tests passed.
  - Full checks: `npm test -- --run` — 40 files, 232 tests passed; `npm run build` passed; `git diff --check` passed.
  - Runtime: N/A — browser automation was not available. The player integration test exercised the 375×667 viewport and verified the accessible removal and Undo flow.
  - Rollback boundary: revert this work-unit commit to remove active-workout set deletion and its five-second Undo action without changing block identity, repeated-block behavior, or persistence infrastructure.
  - Commit: `HEAD` (`feat(workouts): add set removal undo`).
- [x] LF-05 Allow leaving and resuming an unfinished workout.
  - Route: delegated; routing, draft persistence, and UI behavior.
  - Acceptance: leaving preserves the draft; discarding remains explicit; resume is clearly reachable.
  - RED: `npm test -- --run src/UI/components/WorkoutScreen.test.tsx src/UI/hooks/useWorkoutSession.test.tsx` — the new leave and explicit-discard UI tests failed because the controls did not exist. The reload assertion was corrected to inspect the restored exercise directly rather than using an unsupported nested matcher.
  - GREEN: `npm test -- --run src/UI/App.test.tsx src/UI/components/WorkoutScreen.test.tsx src/UI/hooks/useWorkoutSession.test.tsx` — 3 files, 29 tests passed.
  - Full checks: `npm test -- --run` — 40 files, 236 tests passed; `npm run build` passed; `git diff --check` passed.
  - Runtime: N/A — browser automation was not available. Integration tests exercised leave navigation and the compact 390×844 viewport; existing desktop player coverage confirms controls remain in the readable `sm:max-w-md` column.
  - Rollback boundary: revert this work-unit commit to remove non-destructive leave navigation, the cross-menu resume control, and the separate discard control without changing draft persistence or prior workout behavior.
  - Commit: this local work-unit commit (`feat(workouts): allow leaving and resuming`).
- [x] LF-06 Add the native IndexedDB training store without activating it.
  - Route: delegated; new infrastructure adapter and tests.
  - Acceptance: transactional CRUD, per-profile isolation, migration primitives, and quota/error handling.
  - RED: `npm test -- --run src/infrastructure/IndexedDbTrainingRepository.test.ts` — failed because the new adapter did not exist.
  - GREEN: `npm test -- --run src/infrastructure/IndexedDbTrainingRepository.test.ts` — 1 file, 3 tests passed.
  - Full checks: `npm test -- --run` — 41 files, 239 tests passed; `npm run build` passed; `git diff --check` passed.
  - Runtime: N/A — this inactive adapter has no UI or composition path yet; deterministic injected-database tests cover persistence behavior without a browser IndexedDB implementation.
  - Rollback boundary: revert this work-unit commit to remove only the inactive `IndexedDbTrainingRepository` adapter and its tests; Firestore composition and runtime behavior are unchanged.
  - Commit: this local work-unit commit (`feat(storage): add indexeddb training store`).
- [x] LF-07 Add the Firestore synchronization outbox without activating it.
  - Route: delegated; persistence/synchronization infrastructure and tests.
  - Acceptance: queued writes, retries, tombstones, deterministic conflict handling, and status reporting.
  - RED: `npm test -- --run src/infrastructure/FirestoreSyncOutbox.test.ts` — failed because the outbox module did not exist.
  - GREEN: `npm test -- --run src/infrastructure/FirestoreSyncOutbox.test.ts` — 1 file, 7 tests passed.
  - Full checks: `npm test -- --run` — 42 files, 246 tests passed; `npm run build` passed; `git diff --check` passed.
  - Runtime: N/A — this is inactive persistence infrastructure with no composition or UI path yet; injected store/gateway tests cover the durable queue and remote boundary.
  - Rollback boundary: revert this work-unit commit to remove only the inactive durable outbox, deterministic merge helper, and extended sync status metadata; Firestore-first composition remains unchanged.
  - LF-07 commit: recorded in local Git history.
- [x] LF-08 Activate local-first persistence as a dedicated rollback switch.
  - Route: delegated; composition and application data flow.
  - Acceptance: local writes resolve immediately; cloud delay/failure never blocks normal local use; reverting this task's commit restores Firestore-first composition.
  - RED: `npm test -- --run src/infrastructure/LocalFirstTrainingRepository.test.ts` — failed because the local-first repository did not exist.
  - GREEN: `npm test -- --run src/infrastructure/LocalFirstTrainingRepository.test.ts src/UI/components/SyncIndicator.test.tsx` — 2 files, 6 tests passed.
  - Full checks: `npm test -- --run` — 43 files, 249 tests passed; `npm run build` passed; `git diff --check` passed.
  - Runtime: N/A — no browser automation surface was available. The local-first adapter test proves writes complete while the remote drain remains unresolved; the sync-indicator integration test exposes a durable sync error.
  - Rollback boundary: revert this work-unit commit to restore the Firestore-only composition. The inactive IndexedDB and outbox commits remain available but unused.
  - Commit: this local work-unit commit (`feat(storage): activate local-first persistence`).
- [x] LF-09 Add exercise GIF resolution and placeholders.
  - Route: delegated; shared responsive UI component and tests.
  - Acceptance: detail and workout use the same component; dropping a correctly named GIF requires no code change.
  - RED: `npm test -- --run src/UI/components/ExerciseMedia.test.tsx` — failed because `ExerciseMedia` did not exist.
  - GREEN: `npm test -- --run src/UI/components/ExerciseMedia.test.tsx src/UI/components/ExerciseDetail.test.tsx src/UI/components/WorkoutScreen.test.tsx` — 3 files, 16 tests passed.
  - Full checks: `npm test -- --run` — 44 files, 252 tests passed; `npm run build` passed; `git diff --check` passed.
  - Runtime: N/A — browser automation was unavailable. Integration tests cover shared media in the detail and active player at 375×667 and 390×844; desktop player coverage remains green.
  - Rollback boundary: revert this work-unit commit to remove GIF resolution, the graceful placeholder, and asset-folder guidance without affecting training or persistence behavior.
  - Commit: this local work-unit commit (`feat(exercises): add media placeholders`).
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
- LF-04 complete: the active player can remove any recorded set, including an intermediate set, and restore it at its original position within a five-second Undo window. Invalid exercise or set indexes are safe no-ops, while valid mutations persist through the existing draft repository.
- LF-05 complete: leaving the player only changes route, retaining the active draft and active rest timer. Any non-workout screen shows a direct resume control; discard has its own labelled destructive action and still clears both draft and timer.
- LF-06 complete: a native IndexedDB profile-snapshot adapter now provides isolated transactional CRUD, subscription snapshots, safe legacy bootstrap normalization, and explicit unavailable/quota/transaction errors. It is intentionally not wired into composition; Firestore remains the production repository.
- LF-07 complete: a native IndexedDB-backed outbox persists operations before draining them through an injected remote gateway. It preserves FIFO ordering, keeps failed operations (including delete tombstones) durable for retries, exposes pending/failed/error status, and selects remote records deterministically only when there is no pending local mutation. It is intentionally not wired into Firestore composition.
- LF-08 complete: composition now creates an IndexedDB-backed local repository per profile and a Firestore-backed outbox gateway. Local mutations commit before a remote drain begins; existing cloud data merges into the local profile without replacing pending local records. An unavailable Firebase runtime reports a sync issue but keeps device-local use available.
- LF-09 complete: `ExerciseMedia` is shared by exercise detail and the active player. It maps each exercise directly to `/exercise-media/{exerciseId}.gif`, resets if the selected exercise changes, and replaces a failed asset with a localised accessible placeholder. `public/exercise-media/README.md` documents the drop-in convention.
- Next task: LF-10.

## Next step

Implement LF-09 under strict TDD. Do not push, open a pull request, or select a remote chain until the user authorizes remote delivery.
