# NewsDigest

App web privata (PWA) che ogni mattina prepara un digest di notizie sui topic
scelti da ciascun utente, riassunte in italiano e in inglese.

Documenti di riferimento: [`PROJECT_SPEC.md`](PROJECT_SPEC.md) per cosa deve
fare l'app, [`DESIGN.md`](DESIGN.md) per come deve essere fatta.

## Struttura

```
app/                  frontend Angular (la PWA)
pipeline/             lo script che costruisce il digest
firestore-tests/      verifiche sulle regole del database
firestore.rules       chi può leggere e scrivere cosa
firestore.indexes.json
firebase.json         hosting e intestazioni di sicurezza
```

Arriverà `.github/workflows/` (Fase 4).

## Stato: Fase 2

Fatto nella Fase 1: struttura, traduzioni italiano e inglese con cambio
istantaneo, login con Google, lista degli invitati, regole del database,
gestione dei topic, navigazione con le quattro sezioni.

Fatto nella Fase 2: la pipeline gira in locale a vuoto. Legge i topic veri
dal database, scarica i feed, toglie i doppioni, chiede all'AI di scegliere le
notizie e di scriverle in italiano e inglese, e stampa tutto senza salvare
niente. Serve a giudicare se la selezione è buona prima di costruirci sopra.

Oggi e Archivio sono ancora segnaposto: arrivano nella Fase 3, insieme al
salvataggio sul database.

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
   delle scritte `REPLACE_ME`. Copia **solo i valori**: la riga deve restare
   `export const firebaseConfig = {`, se perdi `export` la build non compila.
4. **Una modifica a mano**: cambia `authDomain` da `<project-id>.firebaseapp.com`
   a `<project-id>.web.app`, cioè lo stesso dominio del sito. La finestra di
   login e il suo iframe di ritorno stanno su `authDomain`: se è un dominio
   diverso da quello dell'app sono di terze parti, e Chrome butta via il
   risultato. Il sintomo è preciso: la finestra di Google si apre, carica, si
   chiude e non succede niente.
5. Nello stesso pannello trovi il **Project ID**: mettilo dentro `.firebaserc`
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

Dal terminale, dentro la cartella del progetto. Un comando per riga, aspetta che
finisca prima di lanciare il successivo:

```bash
npx firebase-tools login          # si apre il browser, una volta sola
cd app
npm install
npm run build
cd ..
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

# La pipeline del digest (Fase 2)

Lo script sta in `pipeline/`. Per ora fa solo la **prova a vuoto**: legge,
sceglie, scrive e stampa, ma non salva niente e non manda notifiche. Puoi
lanciarlo quante volte vuoi senza combinare danni.

## 9. Prendi la chiave di Gemini

1. Vai su <https://aistudio.google.com/apikey> e accedi con lo stesso account.
2. **Create API key**. Se ti chiede un progetto Google Cloud, scegli quello di
   Firebase o lasciagli creare il suo, è indifferente.
3. Copia la chiave: si vede per intero solo adesso.

**Non attivare mai la fatturazione** sul progetto Google collegato a questa
chiave. Il piano gratuito sparisce nel momento in cui lo fai, e questa app è
pensata per stare dentro il gratuito.

## 10. Prendi la chiave del database

Lo script scrive e legge come amministratore, quindi non gli bastano i valori
pubblici del punto 4.

1. Console Firebase → ingranaggio → **Project settings** → scheda
   **Service accounts**.
2. **Generate new private key** → conferma. Scarica un file `.json`.

Quel file è **l'accesso completo al database**, non una chiave limitata: le
regole di `firestore.rules` non si applicano a chi lo usa. Non mandarlo a
nessuno e non metterlo nel repository.

## 11. Scrivi il file `.env`

C'è **un solo** file di segreti, e sta nella cartella principale del progetto,
non dentro `pipeline/`.

1. Copia `.env.example` e chiama la copia `.env`, nella stessa cartella.
2. Alla riga `GEMINI_API_KEY=` incolla la chiave del punto 9, subito dopo l'uguale
   e senza spazi.
3. Alla riga `FIREBASE_SERVICE_ACCOUNT=` va il file `.json` del punto 10, **tutto
   intero, su una riga sola, tra apici singoli**. Nel dettaglio:
   - apri il `.json` scaricato con un editor di testo;
   - selezionalo tutto e copialo;
   - torna nel `.env` e scrivi `FIREBASE_SERVICE_ACCOUNT='`, incolla, chiudi con `'`.

   Deve venire una riga sola lunghissima, fatta così:

   ```
   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"newsdigest-827ac",...}'
   ```

   Dentro la chiave privata ci sono delle sequenze `\n`: **lasciale come sono**,
   non sono a capo da espandere, fanno parte della chiave.

Le righe `VAPID_` lasciale vuote: servono dalla Fase 5.

`.env` è già in `.gitignore`, insieme ai nomi che i file delle chiavi prendono
di solito: non finiscono nel repository nemmeno per sbaglio.

### Quale file è quale

Quattro nomi si assomigliano e fanno confusione. Riassunto:

| File | Cosa contiene | Segreto? |
|---|---|---|
| `app/src/app/core/firebase.config.ts` | i valori del punto 4, quelli che il browser vede comunque | no, pubblico |
| `.firebaserc` | solo il Project ID, dice a quale progetto pubblicare | no |
| `firebase.json` | hosting e intestazioni di sicurezza | no |
| `.env` | chiave Gemini e chiave del database | **sì, mai condividere** |

La regola pratica: se sta dentro `app/` lo vede chiunque apra il sito, ed è
normale. Il `.env` non sta dentro `app/` proprio perché non deve arrivarci.

## 12. Lancia la prova

Dalla cartella `pipeline`, un comando per riga:

```bash
npm install
npm run digest -- --dry-run --user tua@email.com
```

Stampa, per ogni topic: quanti articoli ha trovato, quanti sono rimasti dopo
aver tolto i doppioni, e le storie scelte con titolo e riassunto nelle due
lingue, le testate che ne parlano e il link alla fonte principale.

Con dieci topic ci mette qualche minuto: tra una chiamata all'AI e l'altra
aspetta sei secondi di proposito, perché il piano gratuito ha un limite al
minuto.

## Come sceglie cosa cercare

Non devi scrivere tu la chiave di ricerca. Il campo "Parole da cercare" di un
topic puoi lasciarlo vuoto: la pipeline la ricava da sola dal nome del topic e
da "Cosa mi interessa", una volta sola, e la riusa finche' non modifichi il
topic. Se invece lo compili, comanda quello che hai scritto tu.

Serve perche' il nome di un topic non e' quasi mai il termine che i giornali
usano nei titoli. "Geopolitica mondiale" cercato alla lettera trovava 2
articoli freschi su 100; la query ricavata ne trova 174.

Una cosa da sapere leggendo i risultati: i feed di Google News **non danno un
vero riassunto**. Il campo che dovrebbe contenerlo ripete il titolo e la
testata, quindi l'AI lavora su titolo, testata e orario. Funziona bene quando
una notizia e' battuta da molte testate, perche' venti titoli sullo stesso
fatto dicono insieme molto piu' di uno solo.


# Comandi utili

Dalla cartella `app`:

```bash
npm start                # sviluppo in locale su http://localhost:4200
npm run build            # build di produzione
npm run icons            # rigenera le icone dalla favicon.svg
```

Dalla cartella del progetto:

```bash
npx firebase-tools deploy --only hosting     # pubblica solo il sito
npx firebase-tools deploy --only firestore   # pubblica solo regole e indici
```

Dalla cartella `firestore-tests`, per verificare le regole (serve Java):

```bash
npm install
npm test
```

Dalla cartella `pipeline`:

```bash
npm run digest -- --dry-run --user tua@email.com   # prova a vuoto del digest
npm run typecheck                                   # controlla i tipi
```

Su Windows, in PowerShell, `&&` non esiste: lancia i comandi uno per riga.
Per spostarti fra le cartelle usa `cd app` e `cd ..` come comandi a sé.

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
- **`auth/internal-error` appena premi "Accedi con Google"**, senza che si apra
  nessuna finestra: il service worker sta bloccando lo script di Google che
  serve al login. Vedi la nota qui sotto.

## La trappola del service worker e della CSP

`firebase.json` manda un header `Content-Security-Policy` su **tutti** i file,
`ngsw-worker.js` compreso. Un service worker eredita la CSP del proprio script,
e da quel momento **ogni** richiesta che rigira per conto della pagina conta
come `connect-src` — anche se in origine era uno script, un font o un iframe.
Quindi ogni dominio esterno che l'app usa va elencato in `connect-src`, non solo
nella direttiva che gli spetterebbe.

La parte scomoda: il browser congela quella CSP quando installa il worker, e
`ngsw-worker.js` è sempre identico byte per byte, quindi non installa mai un
worker nuovo. Se cambi la CSP, **i browser che hanno già aperto il sito tengono
quella vecchia a tempo indeterminato**, e svuotare la cache dell'app o
deregistrare il worker non basta.

Per sbloccare un browser già rimasto indietro, una volta sola: lucchetto nella
barra degli indirizzi → **Impostazioni sito** → **Elimina dati**, poi ricarica.
Su Android: impostazioni di Chrome → Impostazioni sito → Dati memorizzati.
