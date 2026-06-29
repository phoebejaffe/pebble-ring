# Pebble Ring

A minimal local web app that signs into your Pebble account (via Google OAuth) and dumps your Index content as JSON — recordings, items, lists, and user profile.

Inspired by [index.repebble.com](https://index.repebble.com/).

## Setup

```bash
cd ~/Sites/pebble-ring
npm install
npm run dev
```

Open http://localhost:5174 and sign in with the same Google account you use in the Pebble app.

## How it works

This uses the same Firebase project as the official Pebble / Index web app:

- **Auth**: Firebase Google sign-in (`coreapp-ce061`)
- **Data**: Firestore collections at `recordings/{uid}/recordings`, `items/{uid}/items`, `lists/{uid}/lists`, and `users/{uid}`

## Scripts

```bash
npm run dev        # local dev server
npm run build      # typecheck + production build
npm run test       # watch mode unit tests
npm run test:run   # single-run unit tests
npm run typecheck  # TypeScript only
npm run lint       # ESLint
npm run format     # Prettier write
```

## Features

- Recordings sorted newest-first
- Drag recordings between lists (tags on items — `parentListIds` in Firestore)
- Delete (🗑️) soft-deletes the linked item (`deleted: true` on Firestore)
- Retranscribe — click the model chip → "Retranscribe with universal-2"

### Retranscription setup

```bash
cp .env.example .env.local
# Add ASSEMBLYAI_API_KEY=...
npm run dev
```

The retranscribe code lives in `src/retranscribe/` and can be removed independently — see `src/retranscribe/index.ts`.

### Dev API authentication

Vite dev/preview routes at `/api/transcribe` and `/api/recording-audio` require a Firebase ID token (`Authorization: Bearer …`). The client sends this automatically when you are signed in.

For local debugging only, you can bypass auth:

```bash
PEBBLE_RING_SKIP_API_AUTH=true npm run dev
```

Static `dist/` builds do not include these API routes — retranscribe and proxied audio remain dev-server features unless you deploy a separate backend.

Toggle **Raw JSON** in the header to see the full Firestore dump.

## Notes

- You must use the Google account linked to your Pebble account.
- If sign-in fails on localhost, add `localhost` to the Firebase project's authorized domains (Firebase console → Authentication → Settings).
- This is a personal dev tool, not affiliated with Pebble / Core Devices.
