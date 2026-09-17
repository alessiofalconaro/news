# NewsDigest

App web privata (PWA) che ogni mattina prepara un digest di notizie sui topic
scelti da ciascun utente, riassunte in italiano e in inglese.

Documenti di riferimento: [`PROJECT_SPEC.md`](PROJECT_SPEC.md) per cosa deve
fare l'app, [`DESIGN.md`](DESIGN.md) per come deve essere fatta.

## Struttura

```
app/                  frontend Angular (la PWA)
firestore-tests/      verifiche sulle regole del database
firestore.rules       chi può leggere e scrivere cosa
firestore.indexes.json
firebase.json         hosting e intestazioni di sicurezza
```

Arriveranno `pipeline/` (Fase 2) e `.github/workflows/` (Fase 4).

## Stato: Fase 1

Fatto: struttura, traduzioni italiano e inglese con cambio istantaneo, login con
Google, lista degli invitati, regole del database, gestione dei topic,
navigazione con le quattro sezioni. Oggi e Archivio sono ancora segnaposto:
arrivano nella Fase 3, quando ci sarà qualcosa da mostrarci dentro.

---

# Cosa devi configurare tu, una volta sola

Serve un account Google. Tutto quello che segue sta nel piano gratuito: non
inserire mai una carta di credito.

## 1. Crea il progetto Firebase

1. Vai su <https://console.firebase.google.com> e accedi.
2. **Aggiungi un progetto**. Chiamalo come vuoi, per esempio `newsdigest`.
3. Quando chiede di attivare Google Analytics, rispondi **no**: non serve.
4. A progetto creato, resta sul piano **Spark** (gratuito). Se ti propone
   l'upgrade a Blaze, ignoralo.

## 2. Attiva l'accesso con Google

1. Nel menu a sinistra: **Build** → **Authentication** → **Get started**.
2. Scheda **Sign-in method** → scegli **Google** → **Enable**.
3. Ti chiede una *project support email*: scegli la tua.
4. Salva.

Non devi creare nessun client OAuth a mano: Firebase lo fa da solo.

## 3. Crea il database

1. **Build** → **Firestore Database** → **Create database**.
2. Scegli la modalità **production** (le regole giuste le pubblichiamo noi al
   punto 6, quindi non lasciare aperto niente).
3. Come posizione scegli **eur3** o **europe-west**: i dati restano in Europa e
   l'app risponde più in fretta dall'Italia. **La posizione non si può più
   cambiare dopo**, quindi scegli con calma.

## 4. Collega l'app ai valori del progetto

1. Icona dell'ingranaggio in alto a sinistra → **Project settings**.
2. Scorri fino a **Your apps** → icona `</>` (**Web**) → registra l'app con un
   nome qualsiasi. **Non** attivare Firebase Hosting da qui, lo facciamo dopo.
3. Ti mostra un blocco di codice con `apiKey`, `authDomain`, `projectId` e altri.
   Copia quei valori dentro `app/src/app/core/firebase.config.ts`, al posto
   delle scritte `REPLACE_ME`.
4. Nello stesso pannello trovi il **Project ID**: mettilo dentro `.firebaserc`
   al posto di `REPLACE_ME`.

Questi valori sono pubblici per loro natura: chi apre il sito li vede comunque.
A proteggere i dati sono le regole del punto 6 e la lista del punto 5, non il
fatto di tenerli nascosti.

## 5. Scrivi la lista degli invitati

Solo gli indirizzi presenti in questa lista possono entrare.

1. **Build** → **Firestore Database** → **Start collection**.
2. ID della collezione: `allowedEmails` (scritto esattamente così).
3. Primo documento: come **Document ID** metti **il tuo indirizzo email in
   minuscolo**, per esempio `mario.rossi@gmail.com`. Il documento può restare
   senza campi: conta solo che esista. Se Firestore insiste per avere almeno un
   campo, aggiungi `note` di tipo *string* e lascialo vuoto.
4. Ripeti con l'indirizzo del tuo amico.

Per aggiungere o togliere qualcuno in futuro, si aggiunge o si cancella un
documento qui.

## 6. Pubblica regole, indici e sito

Dal terminale, dentro la cartella del progetto:

```bash
npx firebase-tools login          # si apre il browser, una volta sola
cd app && npm install && npm run build && cd ..
npx firebase-tools deploy --only "firestore,hosting"
```

Alla fine il terminale stampa l'indirizzo del sito, del tipo
`https://<project-id>.web.app`.

## 7. Autorizza il dominio per l'accesso

1. **Build** → **Authentication** → scheda **Settings** → **Authorized domains**.
2. Verifica che ci sia il dominio stampato al punto 6. Di solito Firebase ce lo
   mette da solo; se manca, aggiungilo a mano, altrimenti il login con Google
   dà l'errore `auth/unauthorized-domain`.

## 8. Prova

Apri il sito, accedi con Google e crea un topic. Poi prova ad accedere con un
indirizzo **non** in lista: deve comparire "Accesso non autorizzato".

---

# Comandi utili

```bash
cd app && npm start                # sviluppo in locale su http://localhost:4200
cd app && npm run build            # build di produzione
cd app && npm run icons            # rigenera le icone dalla favicon.svg
npx firebase-tools deploy --only hosting     # pubblica solo il sito
npx firebase-tools deploy --only firestore   # pubblica solo regole e indici
cd firestore-tests && npm install && npm test  # verifica le regole (serve Java)
```

Il comando dei test gira contro l'emulatore ufficiale, in locale: non tocca il
progetto vero e non consuma quota. Vale la pena rilanciarlo ogni volta che si
mettono le mani su `firestore.rules`.

# Se qualcosa non va

- **"Accesso non autorizzato"** con l'indirizzo giusto: controlla che il
  documento in `allowedEmails` abbia come ID l'email **tutta in minuscolo**,
  senza spazi.
- **Errore `auth/unauthorized-domain`**: manca il dominio al punto 7.
- **La pagina dice che Firebase non è configurato**: i valori del punto 4 non
  sono stati incollati, o il file non è stato salvato.
- **Il telefono mostra ancora la versione vecchia**: l'app si aggiorna da sola
  al rientro in primo piano; se hai fretta, chiudila del tutto e riaprila.
