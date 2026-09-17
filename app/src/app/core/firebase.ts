import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebase.config';

export const app = initializeApp(firebaseConfig);

// Persistent cache: the last digest stays readable offline and writes made
// offline are queued and flushed when the network returns. Multi-tab safe.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
