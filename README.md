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

6. Deploy the function and locked-down rules:

   ```bash
   firebase deploy --only functions,firestore,storage
   ```

The deployed endpoint is shown by the CLI and has the form:

```text
https://us-central1-YOUR_PROJECT.cloudfunctions.net/pebbleWebhook
```

In the Pebble Index app, set that URL as the webhook URL and add this custom header:

```text
Authorization: Bearer YOUR_WEBHOOK_TOKEN
```

The token is never committed to this repository. You may choose another header by setting `WEBHOOK_AUTH_HEADER` in the Functions environment, then configure the same header in Index. For a non-Authorization header, use the raw token value rather than the `Bearer` prefix.

## Stored data

Each accepted event creates `webhookEvents/{eventId}` in Firestore. The document includes:

- recorded and received timestamps
- client identifier
- transcription, when provided
- private Storage path, content type, size, and original filename, when audio is provided
- a processing object reserved for category, labels, and future automation state

Audio is stored at `recordings/{eventId}.m4a`. Firestore and Storage rules deny direct client access; the Admin SDK used by the Function performs the writes.

## Local development

Install dependencies and run the checks:

```bash
npm install
npm --prefix functions install
npm run functions:build
npm run functions:test
npm run dev
```

The frontend is only a status page. It contains no Pebble account sign-in and no official-project Firebase configuration.

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
- Categorization is intentionally a later processing step; the initial ingestion document leaves room for labels, categories, and automation results.
