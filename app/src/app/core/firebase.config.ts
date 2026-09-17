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
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.firebasestorage.app',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
};

/** True until the config above has been filled in, so the UI can explain itself. */
export const firebaseConfigured = !firebaseConfig.apiKey.startsWith('REPLACE_ME');
