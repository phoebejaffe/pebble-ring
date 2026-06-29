// Same Firebase project as index.repebble.com / the Pebble mobile app.
export const firebaseConfig = {
  apiKey: "AIzaSyBZ9Cdvwwv9At2lPmc8TxyyEqSXGXejGvc",
  authDomain: "coreapp-ce061.firebaseapp.com",
  projectId: "coreapp-ce061",
  storageBucket: "coreapp-ce061.firebasestorage.app",
  messagingSenderId: "460977838956",
  appId: "1:460977838956:web:9a11a68ec78008fe303149",
  measurementId: "G-J99JXFWEZL",
};

export const firestorePaths = {
  recordings: (uid: string) => `recordings/${uid}/recordings`,
  items: (uid: string) => `items/${uid}/items`,
  lists: (uid: string) => `lists/${uid}/lists`,
  user: (uid: string) => `users/${uid}`,
};
