# AGENTS.md

Webhook receiver for Pebble Index O/Index 01 rings. Ingests `multipart/form-data` recordings + transcriptions into a user-owned Firebase project, serves an authenticated recordings dashboard, and appends every transcription as an encrypted line to the user's daily note in the separate `~/Sites/notes` app.

## Commits and verification

- **Run `npm run verify` before every commit** (also enforced by `.cursor/rules/pre-commit-verify.mdc`): Prettier on changed files, ESLint, frontend + functions tests, both builds. If Prettier modifies files, re-stage them.
- Active work happens on `pebble-ring-webhook`. `pebble-ring-current-state` preserves the old viewer that read Pebble's official Firebase project — do not change it. `main` is the earlier baseline.
- The official Pebble project (`coreapp-ce061`) must not appear in code, config, or docs. All reads/writes go to the user-owned project.

## Deployed infrastructure

Firebase project: `pebble-ring-sync-20260911` (region `us-central1`). Runtime service account: `pebble-functions-runtime@pebble-ring-sync-20260911.iam.gserviceaccount.com` (set via `serviceAccount:` on every function in `functions/src/index.ts` / `actions.ts`).

| Function                      | Purpose                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pebbleWebhook`               | HTTPS ingestion. `Authorization: Bearer $WEBHOOK_AUTH_TOKEN`, ≤25 MB audio → `recordings/{eventId}.m4a`, event doc `webhookEvents/{eventId}`, returns 202. Event ID = content hash → duplicates are acknowledged.                                                                                                                                          |
| `processWebhookEvent`         | Firestore `onDocumentCreated` trigger (`retry: true`, 540s/512MiB). Optionally retranscribes audio through the separate AssemblyAI project, preserves the original, stores `retranscription.assemblyai.text`, uses improved text when available, then prepends the text (with a trailing `[__](recordingAudio link)` when audio exists) to the day's note. |
| `eventsApi` / `eventAudioUrl` | Dashboard APIs — Firebase Auth ID-token required; returns latest 100 events / 15-min signed audio URL.                                                                                                                                                                                                                                                     |
| `recordingAudio`              | Stable `GET ?id=<eventId>&t=<hmac>` redirect endpoint. Verifies `LINK_SIGNING_SECRET` HMAC, mints a fresh signed URL, 302s. Links in notes never expire; rotating the secret revokes them.                                                                                                                                                                 |

Deploy: `firebase deploy --only functions,firestore,storage --project pebble-ring-sync-20260911`. Use `--force` when redeploying `processWebhookEvent` non-interactively (retry confirmation).

## Secrets and environment

Firebase Secret Manager (never commit, never log): `WEBHOOK_AUTH_TOKEN`, `NOTES_FIREBASE_PROJECT_ID` (= `notes-363bc`), `NOTES_USER_ID`, `NOTES_RECOVERY_PHRASE`, `LINK_SIGNING_SECRET`, `ASSEMBLYAI_API_KEY` (separate AssemblyAI account/project; never reuse the `coreads` key), `VAPID_PRIVATE_KEY` (Web Push; its public half is the non-secret `VAPID_PUBLIC_KEY` env value).

Ignored `functions/.env` (non-secret config): `NOTES_TIME_ZONE=America/Los_Angeles`, `NOTES_ROLLOVER_HOUR=4`, optional `RECORDING_LINK_BASE_URL` override, `WEBHOOK_AUTH_HEADER`. **A value may not exist in both `.env` and Secret Manager** — deploy fails with "secret environment variable overlaps". Secrets belong only in Secret Manager.

## IAM pitfalls (all burned before — check these first on permission errors)

The custom runtime SA needs, in the _receiver_ project: `roles/datastore.user`, Storage object access, `roles/eventarc.eventReceiver` (Firestore trigger delivery), and **`roles/iam.serviceAccountTokenCreator` on itself** — `getSignedUrl`/`signBlob` fails with `SigningError` / `iam.serviceAccounts.signBlob denied` without it. The Eventarc **service agent** (`service-PROJECT_NUMBER@gcp-sa-eventarc.iam.gserviceaccount.com`) needs `roles/run.invoker` or trigger deliveries fail with `run.routes.invoke` denials. In the _Notes_ project the runtime SA has `roles/datastore.user` — used via Application Default Credentials on a named Firebase app (`notesSync.ts`); org policy `constraints/iam.disableServiceAccountKeyCreation` forbids JSON keys, so never try to create one.

## Webhook parsing gotcha

Firebase Functions consumes the request stream and exposes the body via `req.rawBody` — `parseMultipartRequest` in `functions/src/webhook.ts` must read `rawBody` when present or deployed requests fail with "Unexpected end of form" while local streaming tests still pass.

## Notes integration contract (`functions/src/notesSync.ts`)

- Writes to `users/{NOTES_USER_ID}/documents/{day}` in project `notes-363bc`, matching the Notes app's exact format: `{ markdown, updatedAt }` JSON → AES-256-GCM → `payload` envelope with `associatedData: notes:daily-document:{day}`. Data key recovered from `metadata/keyBundle` via PBKDF2-SHA-256, 600k iterations, normalized recovery phrase. The PBKDF2 result is cached per key-bundle salt.
- Day key comes from `recordedAt` (not receipt time) in `NOTES_TIME_ZONE`; before `NOTES_ROLLOVER_HOUR` counts as the previous day.
- Insertion: `formatTranscriptionLine` → `text[__](link)` when audio exists; `prependNoteLine` separates every new transcription from existing content with `\n\n`.
- Daily-note updates run inside `firestore.runTransaction`: read the encrypted document, decrypt it, prepend the line, re-encrypt, and write in the callback. Keep the operation idempotent and side-effect-free because Firestore may retry the callback when concurrent recordings race.
- Org policy + encryption mean **transcription plaintext, note plaintext, recovery phrase, tokens, and auth headers must never be logged**. Processing status (`received/running/completed/failed/skipped` + reason) goes on the source event doc — safe error messages only.

## AssemblyAI retranscription

`functions/src/retranscribe.ts` uses the official `assemblyai` Node SDK (`universal-3-5-pro`) with `keyterms_prompt` biasing toward custom spellings (default Masumi, Coreads, Timeblock, Noteses; override via comma-separated `RETRANSCRIBE_KEYTERMS` env). It generates a one-hour signed Storage URL for private audio, sends that URL to AssemblyAI, stores the result in `retranscription.assemblyai.text`, and falls back to the original Pebble transcript if the secret is absent or the API fails. The temporary URL is never persisted or logged. New events only; existing events are not automatically reprocessed.

## Named-note routing

`appendToNamedNote` in `notesSync.ts` runs before the daily-note append (only when no `notify`/`urgent` keyword matched). It lists `users/{NOTES_USER_ID}/namedDocuments` in the Notes project, decrypts each title with `notes:named-document:${id}` associated data, and matches the transcription's leading word(s) against titles — case-insensitive and singular/plural tolerant ("idea" matches "Ideas"; longest title wins). On a match the title is stripped, the remainder capitalized, and the line prepended inside a transaction (same merge-safe pattern; no `writeId`, so the Notes app sees it as an external write). Tombstoned (`deleted`) notes are skipped; a title-only memo or any failure falls back to the daily note. The matched title is recorded at `processing.namedNote`.

## Ring phone notifications

`functions/src/notify.ts` checks the final transcription for a leading `notify`/`urgent` keyword (`extractNotificationRequest`). When present, the keyword is stripped and the emoji prefixes the note line (`🗒️ Remember…` or `🚨 Remember…`) before append, and a Web Push (`web-push`, VAPID, `urgency: high`) goes to every `users/{NOTES_USER_ID}/pushSubscriptions/*` doc in the Notes project — payload `{title: "Noteses", body: "<emoji> <Body>"}` (🗒️ for `notify`, 🚨 for `urgent`). Dead endpoints (404/410) are deleted. The function also keeps `metadata/pushConfig.vapidPublicKey` in sync so the PWA can subscribe without build-time config. Result lands on `processing.notification.status` (`sent`/`failed`/`no_subscriptions`/`not_configured`).

## Cross-repo relationship

`~/Sites/notes` (branch `feature/mdx-editor-migration`) owns the encryption format and its own `AGENTS.md`/`SPEC.md` — if you change the document format there, this repo's `notesSync.ts` must match. The Notes editor renders the trailing `[__](…)` recording links, so `recordingAudio` redirects must keep working for the popover to play.
