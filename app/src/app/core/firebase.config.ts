/**
 * Firebase project configuration.
 *
 * These values are PUBLIC by design: the security comes from the Firestore
 * rules and from the allowed-emails list, not from hiding the API key. The two
 * reference apps commit theirs in the same way.
 *
 * TODO(setup): replace the placeholders with the real values from
 * Firebase console -> Project settings -> Your apps -> Web app -> SDK setup.
 * The README explains where to click.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyDKl8TW5DeJlDHJrLPZnyvh7jfvN-43KrI",
  // Deliberately the hosting domain, NOT the <project>.firebaseapp.com the
  // Firebase console hands you. The sign-in popup and its relay iframe live on
  // authDomain: when that differs from the site's own origin they are
  // third-party, and Chrome's storage partitioning drops the result on the
  // floor - the popup closes and nothing happens. Same origin, no such problem.
  authDomain: "newsdigest-827ac.web.app",
  projectId: "newsdigest-827ac",
  storageBucket: "newsdigest-827ac.firebasestorage.app",
  messagingSenderId: "191721565121",
  appId: "1:191721565121:web:07a5c3bbcf8b47152d1d40"
};

/** True until the config above has been filled in, so the UI can explain itself. */
export const firebaseConfigured = !firebaseConfig.apiKey.startsWith('REPLACE_ME');
