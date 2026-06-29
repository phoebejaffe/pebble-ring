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

The UI is intentionally bare — just a JSON dump for now.

## Notes

- You must use the Google account linked to your Pebble account.
- If sign-in fails on localhost, add `localhost` to the Firebase project's authorized domains (Firebase console → Authentication → Settings).
- This is a personal dev tool, not affiliated with Pebble / Core Devices.
