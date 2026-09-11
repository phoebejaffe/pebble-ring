# Pebble Index webhook receiver

A small receiver for Pebble Index O/Index 01 webhooks. It accepts recordings and/or transcriptions from the Index app, stores audio privately in Firebase Storage, and stores event metadata in Firestore for later categorization and automation.

This repository no longer reads from or writes to Pebble's official Firebase project. The receiver must be deployed to a Firebase project that you control.

## Webhook payload

Pebble sends an HTTPS `POST` using `multipart/form-data`:

| Field           | Description                                 |
| --------------- | ------------------------------------------- |
| `audio`         | Optional M4A recording (`audio/mp4`)        |
| `transcription` | Optional transcription text                 |
| `recordedAt`    | Required Unix timestamp in milliseconds     |
| `client`        | Required client identifier, normally `ring` |

The receiver accepts audio up to 25 MB. It returns `202` only after the event has been persisted. Equivalent repeated payloads are identified and acknowledged as duplicates.

## Create and configure Firebase

1. Create a new Firebase project that you own at [Firebase Console](https://console.firebase.google.com/).
2. Enable Cloud Firestore and Cloud Storage. Firebase Functions and Storage may require the Blaze billing plan.
3. Install the Firebase CLI if needed:

   ```bash
   npm install -g firebase-tools
   firebase login
   ```

4. Select your project from the repository root:

   ```bash
   firebase use --add
   ```

   Choose your new project. This writes a local `.firebaserc`, which is intentionally ignored by Git.

5. Configure the receiver secret. The default header is `Authorization` with a Bearer token:

   ```bash
   firebase functions:secrets:set WEBHOOK_AUTH_TOKEN
   ```

6. Deploy the functions and locked-down rules:

   ```bash
   firebase deploy --only functions,firestore,storage
   ```

The deployed webhook endpoint is shown by the CLI and has the form:

```text
https://us-central1-YOUR_PROJECT.cloudfunctions.net/pebbleWebhook
```

In the Pebble Index app, set that URL as the webhook URL and add this custom header:

```text
Authorization: Bearer YOUR_WEBHOOK_TOKEN
```

The token is never committed to this repository. You may choose another header by setting `WEBHOOK_AUTH_HEADER` in the Functions environment, then configure the same header in Index. For a non-Authorization header, use the raw token value rather than the `Bearer` prefix.

## Recordings dashboard

The project includes a dashboard similar to the former recordings interface. It uses Google sign-in through Firebase Authentication in your new project, lists the latest 100 events, supports transcription search, shows processing status, and loads private audio through short-lived signed URLs.

Enable Google as a sign-in provider in Firebase Authentication, then create a web app in the same Firebase project. Copy its configuration into `.env.local`:

```bash
cp .env.example .env.local
npm run dev
```

Set the `VITE_FIREBASE_*` values and `VITE_API_BASE_URL` to the deployed Functions base URL. The dashboard calls `eventsApi` and `eventAudioUrl`; it does not use the webhook token in the browser. Set `DASHBOARD_ORIGIN` in the Functions environment to the deployed dashboard origin when hosting it separately, such as on GitHub Pages.

## Stored data

Each accepted event creates `webhookEvents/{eventId}` in Firestore. The document includes:

- recorded and received timestamps
- client identifier
- transcription, when provided
- private Storage path, content type, size, and original filename, when audio is provided
- a processing object reserved for category, labels, and future automation state

Audio is stored at `recordings/{eventId}.m4a`. Firestore and Storage rules deny direct client access; the Admin SDK used by the Function performs the writes.

## Transcription actions

A Firestore-triggered Function named `processWebhookEvent` runs automatically after each event is stored. It matches transcriptions that begin with `Note` (case-insensitive), removes the command prefix, and writes a normalized line such as `Note — call the dentist` at the top of the corresponding daily note in `~/Sites/notes`.

The Notes app encrypts daily documents in the browser with an AES-GCM key derived from its recovery phrase. The backend therefore needs the Notes Firebase project credentials, the Notes user ID, and the recovery phrase so it can decrypt the existing daily document and re-encrypt it in the exact same format. Configure these as Firebase Secrets in the receiver project:

```bash
firebase functions:secrets:set NOTES_FIREBASE_PROJECT_ID
firebase functions:secrets:set NOTES_FIREBASE_CLIENT_EMAIL
firebase functions:secrets:set NOTES_FIREBASE_PRIVATE_KEY
firebase functions:secrets:set NOTES_USER_ID
firebase functions:secrets:set NOTES_RECOVERY_PHRASE
```

For the values, use the Notes project's Firebase project ID, the service account's email, its private key with newline escapes preserved, the Notes Firebase Auth user's UID, and the exact recovery phrase used to unlock encrypted sync in the Notes app. The Notes project currently uses `notes-363bc`; verify the ID in `~/Sites/notes/.firebaserc` before configuring production.

Use a service account from the Notes Firebase project with only the minimum Firestore access needed for that user's paths. The recovery phrase is equivalent to the Notes sync key: never put it in source code, frontend variables, GitHub Actions variables, logs, or chat. The action is skipped when the secrets are absent, and processing status is recorded on the source event. Failed actions are marked failed and retried by the Firestore trigger.

Pebble's webhook includes a timestamp but not the phone's timezone. Set the timezone and the same rollover hour used by Notes in the Functions environment, for example:

```text
NOTES_TIME_ZONE=America/Los_Angeles
NOTES_ROLLOVER_HOUR=4
```

Put these in the ignored `functions/.env` file before deployment, or configure equivalent Functions environment values. Because Pebble does not send timezone metadata, this setting must match the timezone used by the Notes device. The timestamp is assigned to the previous logical day when it occurs before the rollover hour. The same action boundary can later dispatch category rules, call an external HTTPS service, enqueue Cloud Tasks, or invoke an LLM/classifier.

## Local development

Install dependencies and run the checks:

```bash
npm install
npm --prefix functions install
npm run functions:build
npm run functions:test
npm run dev
```

The frontend is the authenticated recordings dashboard. It contains no official-project Firebase configuration; all client configuration points at the Firebase project you control.

For local emulator work, create `functions/.env.local` from the example and start Firebase emulators after selecting a Firebase project:

```bash
cp functions/.env.example functions/.env.local
firebase emulators:start --only functions,firestore,storage
```

Then send a representative request with `curl` using the emulator's Function URL. The unit tests cover the multipart parser and authentication without requiring Firebase credentials.

## Scripts

```bash
npm run dev             # static status page
npm run build           # build the status page
npm run test:run        # status-page tests, if present
npm run functions:build # compile Functions
npm run functions:test  # run webhook tests
npm run verify          # repository formatting, lint, tests, and build
```

## Operational notes

- Use HTTPS and a long random header token.
- Do not log request bodies, audio, transcriptions, or authorization values.
- Pebble currently does not guarantee retries after a failed webhook request, so the receiver persists before returning success and deduplicates equivalent deliveries.
- Set Storage retention and Firestore retention according to your privacy and cost requirements.
- The Notes recovery phrase is placed in Firebase Secret Manager so the backend can perform compatible encryption; anyone who can access that secret can decrypt and modify the configured user's notes.
- Categorization is intentionally a later processing step; the initial ingestion document leaves room for labels, categories, and automation results.
