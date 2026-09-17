import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';

const ME = 'mario@example.com';
const FRIEND = 'luigi@example.com';
const STRANGER = 'wario@example.com';

const env = await initializeTestEnvironment({
  projectId: 'demo-newsdigest',
  firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
});

await env.clearFirestore();
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'allowedEmails', ME), {});
  await setDoc(doc(db, 'allowedEmails', FRIEND), {});
  await setDoc(doc(db, 'profiles', 'uidMe'), { email: ME, displayName: 'Mario', language: 'it', createdAt: 1 });
  await setDoc(doc(db, 'profiles', 'uidFriend'), { email: FRIEND, displayName: 'Luigi', language: 'en', createdAt: 1 });
  await setDoc(doc(db, 'topics', 'tMe'), topic('uidMe'));
  await setDoc(doc(db, 'topics', 'tFriend'), topic('uidFriend'));
  await setDoc(doc(db, 'digests', 'dMe'), { userId: 'uidMe', digestDate: '2026-09-17', status: 'ok', failedTopics: [], createdAt: 1 });
  await setDoc(doc(db, 'stories', 'sMe'), { digestId: 'dMe', userId: 'uidMe', rank: 1 });
  await setDoc(doc(db, 'seenArticles', 'aMe'), { topicId: 'tMe', urlHash: 'x', firstSeenAt: 1 });
  await setDoc(doc(db, 'pushSubscriptions', 'pMe'), { userId: 'uidMe', endpoint: 'e', p256dh: 'p', auth: 'a', createdAt: 1 });
});

function topic(userId, over = {}) {
  return {
    userId, name: 'NBA', interests: 'partite e mercato', searchQuery: '',
    sourceLanguage: 'it', extraFeeds: [], maxStories: 5, isActive: true,
    sortOrder: 0, createdAt: 1, updatedAt: 1, ...over,
  };
}

const me = env.authenticatedContext('uidMe', { email: ME, email_verified: true }).firestore();
const friend = env.authenticatedContext('uidFriend', { email: FRIEND, email_verified: true }).firestore();
const stranger = env.authenticatedContext('uidStranger', { email: STRANGER, email_verified: true }).firestore();
const unverified = env.authenticatedContext('uidMe2', { email: ME, email_verified: false }).firestore();
const anon = env.unauthenticatedContext().firestore();

const results = [];
async function check(name, fn) {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); }
}

// --- allow list -------------------------------------------------------------
await check('invitato legge la PROPRIA riga di allowedEmails', () =>
  assertSucceeds(getDoc(doc(me, 'allowedEmails', ME))));
await check('invitato NON legge la riga di un altro', () =>
  assertFails(getDoc(doc(me, 'allowedEmails', FRIEND))));
await check('nessuno puo elencare gli invitati', () =>
  assertFails(getDocs(collection(me, 'allowedEmails'))));
await check('nessuno puo scrivere fra gli invitati', () =>
  assertFails(setDoc(doc(me, 'allowedEmails', STRANGER), {})));

// --- profiles ---------------------------------------------------------------
await check('invitato legge il proprio profilo', () =>
  assertSucceeds(getDoc(doc(me, 'profiles', 'uidMe'))));
await check('invitato NON legge il profilo di un altro', () =>
  assertFails(getDoc(doc(me, 'profiles', 'uidFriend'))));
await check('estraneo NON legge nulla', () =>
  assertFails(getDoc(doc(stranger, 'profiles', 'uidStranger'))));
await check('estraneo NON crea il proprio profilo', () =>
  assertFails(setDoc(doc(stranger, 'profiles', 'uidStranger'), { email: STRANGER, displayName: 'W', language: 'it', createdAt: 1 })));
await check('email non verificata: accesso negato', () =>
  assertFails(getDoc(doc(unverified, 'profiles', 'uidMe2'))));
await check('non autenticato: accesso negato', () =>
  assertFails(getDoc(doc(anon, 'profiles', 'uidMe'))));
await check('invitato cambia la propria lingua', () =>
  assertSucceeds(updateDoc(doc(me, 'profiles', 'uidMe'), { language: 'en' })));
await check('lingua non valida rifiutata', () =>
  assertFails(updateDoc(doc(me, 'profiles', 'uidMe'), { language: 'de' })));
await check('non si puo cambiare la email del profilo', () =>
  assertFails(updateDoc(doc(me, 'profiles', 'uidMe'), { email: FRIEND })));

// --- topics -----------------------------------------------------------------
await check('invitato legge i propri topic con la query dell app', () =>
  assertSucceeds(getDocs(query(collection(me, 'topics'), where('userId', '==', 'uidMe'), orderBy('sortOrder')))));
await check('invitato NON puo leggere i topic di un altro', () =>
  assertFails(getDocs(query(collection(me, 'topics'), where('userId', '==', 'uidFriend'), orderBy('sortOrder')))));
await check('invitato NON legge il singolo topic altrui', () =>
  assertFails(getDoc(doc(me, 'topics', 'tFriend'))));
await check('invitato crea un proprio topic', () =>
  assertSucceeds(setDoc(doc(me, 'topics', 'nuovo'), topic('uidMe'))));
await check('non si crea un topic intestato a un altro', () =>
  assertFails(setDoc(doc(me, 'topics', 'furbo'), topic('uidFriend'))));
await check('nome vuoto rifiutato', () =>
  assertFails(setDoc(doc(me, 'topics', 'bad1'), topic('uidMe', { name: '' }))));
await check('interests vuoto rifiutato', () =>
  assertFails(setDoc(doc(me, 'topics', 'bad2'), topic('uidMe', { interests: '' }))));
await check('maxStories fuori range rifiutato', () =>
  assertFails(setDoc(doc(me, 'topics', 'bad3'), topic('uidMe', { maxStories: 99 }))));
await check('sourceLanguage sconosciuta rifiutata', () =>
  assertFails(setDoc(doc(me, 'topics', 'bad4'), topic('uidMe', { sourceLanguage: 'fr' }))));
await check('riordino (solo sortOrder) accettato', () =>
  assertSucceeds(updateDoc(doc(me, 'topics', 'tMe'), { sortOrder: 3 })));
await check('non si puo riassegnare un topic a un altro utente', () =>
  assertFails(updateDoc(doc(me, 'topics', 'tMe'), { userId: 'uidFriend' })));
await check('invitato elimina un proprio topic', () =>
  assertSucceeds(deleteDoc(doc(me, 'topics', 'nuovo'))));
await check('invitato NON elimina il topic di un altro', () =>
  assertFails(deleteDoc(doc(me, 'topics', 'tFriend'))));

// --- pipeline collections ---------------------------------------------------
await check('invitato legge i propri digest', () =>
  assertSucceeds(getDoc(doc(me, 'digests', 'dMe'))));
await check('altro utente NON legge i digest miei', () =>
  assertFails(getDoc(doc(friend, 'digests', 'dMe'))));
await check('il browser non scrive i digest', () =>
  assertFails(setDoc(doc(me, 'digests', 'falso'), { userId: 'uidMe', digestDate: 'x', status: 'ok', failedTopics: [], createdAt: 1 })));
await check('invitato legge le proprie storie', () =>
  assertSucceeds(getDoc(doc(me, 'stories', 'sMe'))));
await check('il browser non scrive le storie', () =>
  assertFails(updateDoc(doc(me, 'stories', 'sMe'), { rank: 9 })));
await check('seenArticles invisibile al browser', () =>
  assertFails(getDoc(doc(me, 'seenArticles', 'aMe'))));

// --- push -------------------------------------------------------------------
await check('invitato registra la propria iscrizione push', () =>
  assertSucceeds(setDoc(doc(me, 'pushSubscriptions', 'nuova'), { userId: 'uidMe', endpoint: 'e2', p256dh: 'p', auth: 'a', createdAt: 1 })));
await check('non si registra una iscrizione per un altro', () =>
  assertFails(setDoc(doc(me, 'pushSubscriptions', 'furba'), { userId: 'uidFriend', endpoint: 'e3', p256dh: 'p', auth: 'a', createdAt: 1 })));
await check('invitato cancella la propria iscrizione', () =>
  assertSucceeds(deleteDoc(doc(me, 'pushSubscriptions', 'pMe'))));

await env.cleanup();

let failed = 0;
for (const [status, name, detail] of results) {
  if (status === 'FAIL') failed++;
  console.log(`${status === 'PASS' ? '  ok  ' : ' FAIL '} ${name}${detail ? ' -> ' + detail : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} verifiche superate`);
process.exit(failed ? 1 : 0);
