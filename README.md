# NewsDigest

App web privata (PWA) che ogni mattina prepara un digest di notizie sui topic
scelti da ciascun utente, riassunte in italiano e in inglese.

Documenti di riferimento: [`PROJECT_SPEC.md`](PROJECT_SPEC.md) per cosa deve
fare l'app, [`DESIGN.md`](DESIGN.md) per come deve essere fatta.

## Struttura

```
app/                  frontend Angular (la PWA)
pipeline/             lo script che costruisce il digest
.github/workflows/    il lancio automatico ogni mattina
firestore-tests/      verifiche sulle regole del database
firestore.rules       chi può leggere e scrivere cosa
firestore.indexes.json
firebase.json         hosting e intestazioni di sicurezza
```

## Stato: completo

**Fase 1** — struttura, traduzioni italiano e inglese con cambio istantaneo,
login con Google, lista degli invitati, regole del database, gestione dei
topic, navigazione con le quattro sezioni.

**Fase 2** — la pipeline: legge i topic dal database, ricava da sola le parole
da cercare, scarica i feed, toglie i doppioni, chiede all'AI di scegliere le
notizie e di scriverle in italiano e inglese.

**Fase 3** — le notizie si salvano sul database e si vedono nell'app,
raggruppate per topic e con l'immagine del soggetto quando esiste.

**Fase 4** — il digest si costruisce da solo, anche a computer spento, all’ora
che ciascuno sceglie.

**Fase 5** — notifiche push quando il digest è pronto.

**Fase 6** — controllo visivo, e questo README.

---

# Come si usa, tutti i giorni

Questa parte serve dopo, quando tutto è configurato. Per mettere in piedi il
progetto da zero, vai alla sezione successiva.

## Come funziona, in breve

Ogni topic è un argomento che vuoi seguire: gli dai un nome e scrivi, con parole
tue, cosa ti interessa di quell'argomento.

All'ora che hai scelto, su un computer di GitHub parte uno script. Per ogni
topic scarica quello che Google News ha raccolto nelle ultime 24 ore, butta via
i doppioni e quello che hai già letto nell'ultima settimana, e passa il resto a
un'intelligenza artificiale con due domande: *quali di queste meritano* e *come
si riassumono*. Quello che resta finisce nel database, e l'app lo mostra.

Tre cose spiegano quasi tutto quello che vedrai:

- **Una "notizia" non è un articolo, è un fatto.** Se dieci testate raccontano
  la stessa cosa, diventa una sola voce con scritto "10 fonti". Toccando quel
  numero le vedi tutte.
- **L'ordine non è casuale.** Conta soprattutto quante testate diverse ne
  parlano: è l'unico segnale oggettivo di importanza che esista senza chiedere
  un parere a qualcuno.
- **L'immagine è del soggetto, non dell'evento.** Alla foto dell'articolo non si
  arriva, quindi si cerca su Wikipedia il soggetto della notizia: per i Cavaliers
  il logo, per lo Stretto di Hormuz la foto dello stretto.

## Aggiungere o togliere un invitato

Solo gli indirizzi in elenco possono entrare. Si gestiscono dalla console, non
dall'app.

1. <https://console.firebase.google.com/project/newsdigest-827ac/firestore>
2. Collezione **`allowedEmails`**.
3. **Aggiungere:** *Add document* → come **ID** l'indirizzo email **tutto in
   minuscolo**. Campi: nessuno. Se insiste, metti `note` di tipo *string* vuoto.
4. **Togliere:** apri il documento e cancellalo.

Chi togli non entra più al prossimo accesso. Quello che aveva già scritto resta
nel database.

L'errore più comune è una maiuscola o uno spazio nell'indirizzo: l'ID deve
essere identico all'email con cui la persona accede a Google.

## Farsi mandare il digest adesso

Due strade, e cambia solo la velocità.

**Dall'app**, e funziona per chiunque: **Impostazioni** → **Aggiorna adesso**.
La richiesta viene raccolta alla prossima sveglia. Sotto il pulsante l'app
scrive due cose: se sostituirà la tornata programmata o se se ne aggiungerà
una, e **a che ora arriveranno le notizie**.

Di giorno è entro mezz'ora. Ma **di notte il sistema dorme**: fra le 23:30 e le
06:00 non si sveglia nessuno, quindi premendo alle 23:55 le notizie arrivano
verso le 06:00 del mattino dopo. L'app lo scrive, invece di lasciartelo
scoprire aspettando.

**Da GitHub**, e parte in pochi secondi, ma serve accesso al repository:
<https://github.com/alessiofalconaro/news/actions/workflows/daily-digest.yml>
→ **Run workflow** → spunta *Lancia subito* → **Run workflow**. In un paio di
minuti il digest c'è e la notifica è arrivata.

Se avevi già premuto *Aggiorna adesso* nell'app, il lancio manuale consuma anche
quella richiesta: non otterrai un secondo digest mezz'ora dopo.

## Se qualcosa smette di funzionare

La domanda da farsi è sempre la stessa: **il digest non è stato costruito, o è
stato costruito e l'app non lo mostra?** I due casi si guardano in posti diversi.

### Se manca il digest: i log di GitHub

<https://github.com/alessiofalconaro/news/actions>

Ogni riga è un'esecuzione. Il pallino verde significa riuscita, la X fallita.
Apri quella che ti interessa e clicca **Costruisci il digest**: dentro c'è lo
stesso testo che vedresti lanciandolo da casa.

Righe che vale la pena riconoscere:

| Nel log | Significa |
|---|---|
| `non e' la sua ora` | tutto bene: non era il tuo orario, e non ha fatto niente |
| `il digest di oggi esiste gia'` | già costruito, non lo rifà |
| `salvato digest ... stato ok` | riuscito |
| `stato partial` | qualche topic è fallito, gli altri ci sono |
| `topic "X" fallito` | solo quel topic; guarda la riga dopo per il motivo |
| `429` oppure `quota` | limite giornaliero di Gemini esaurito, riprova domani |
| `notifiche non configurate` | mancano i segreti VAPID |
| `nessun dispositivo iscritto` | notifiche da attivare nell'app |

Le esecuzioni a vuoto sono la norma: il workflow si sveglia ogni mezz'ora e
quasi sempre non tocca a nessuno.

### Se il digest c'è ma l'app non lo mostra

Quasi sempre è l'app rimasta indietro: **chiudila del tutto e riaprila**, due
volte se serve. Il perché è nella nota sul service worker in fondo.

Se invece compare un riquadro **"Non riesco a caricare il digest"** con un
codice sotto, quello è un errore vero: mandami il codice.

### Il database, per guardare coi propri occhi

<https://console.firebase.google.com/project/newsdigest-827ac/firestore>

- `digests` — uno per persona per giorno. `status` dice com'è andata,
  `doneHours` quali tornate sono state fatte.
- `stories` — le notizie.
- `topics` — i tuoi argomenti. `autoQuery` è la ricerca che il sistema si è
  ricavato da solo.
- `allowedEmails` — chi può entrare.
- `seenArticles` — memoria degli articoli già usati. Si svuota da sola a 14
  giorni.

Si può guardare tutto senza rischi. A cancellare, invece, si fa danno: le
notizie di `stories` non si ricostruiscono.

## Quando si consuma qualcosa

Tutto sta nei piani gratuiti, ma i limiti esistono:

- **GitHub Actions**: ~1080 minuti al mese sui 2000 inclusi. Senza carta
  registrata, a minuti esauriti i job si **bloccano, non si pagano**.
- **Gemini**: qualche decina di chiamate al giorno, due per topic più una la
  prima volta che si ricava la ricerca.
- **Firebase**: letture e scritture minime, molto sotto la soglia.

Conviene attivare le email di avviso di GitHub al 90% del consumo.

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


# Il lancio automatico (Fase 4)

Il digest si costruisce da solo ogni mattina su GitHub, quindi funziona anche
se il tuo computer è spento. Il file che lo governa è
`.github/workflows/daily-digest.yml`.

**Il repository deve restare privato.** Con quello pubblico chiunque vedrebbe
il codice: non i segreti, che stanno altrove, ma non c'è motivo di esporlo.

## 13. Metti i segreti su GitHub

Lo script sul server non può leggere il tuo `.env`: quei due valori vanno
copiati anche su GitHub.

1. Vai su <https://github.com/alessiofalconaro/news/settings/secrets/actions>
2. **New repository secret**, due volte:

| Name | Secret |
|---|---|
| `GEMINI_API_KEY` | la stessa riga che hai nel `.env` |
| `FIREBASE_SERVICE_ACCOUNT` | tutto il contenuto del file `.json`, **senza** gli apici singoli |

Gli apici nel `.env` servono a delimitare il valore per il file; qui il campo
è già delimitato di suo, quindi mettili e il JSON risulterebbe sbagliato.

## 14. Prova che funzioni

Non aspettare domani mattina.

1. Vai su <https://github.com/alessiofalconaro/news/actions>
2. A sinistra scegli **Digest quotidiano** → **Run workflow**.
3. Metti la spunta su **Lancia subito, ignorando il controllo dell'orario** e
   conferma.

Ci mette qualche minuto. Cliccando sull'esecuzione vedi gli stessi messaggi che
vedi quando lo lanci da casa: quanti articoli ha trovato per topic, quante
storie ha scelto, e alla fine `salvato digest ... stato ok`.

Se lo lanci **senza** la spunta e non sono le 10-12 in Italia, scrive
`fuori dalla finestra` e si ferma: è previsto, non è un errore.

## A che ora arriva

L'ora si sceglie **dall'app**, in Impostazioni → *Ora del digest*, fra le 6 e
le 22, ed è sempre **ora italiana**: il digest delle 10:00 arriva alle 10:00 in
Italia anche se sei dall'altra parte del mondo. Se il telefono è su un altro
fuso, l'app scrive lì sotto a che ora corrispondono dove ti trovi. Puoi chiederne **una o due al giorno**: per esempio la mattina e la
sera. Vale solo per chi la imposta, quindi tu e il tuo amico potete avere orari
diversi.

La seconda tornata **si aggiunge** alla prima, non la sostituisce: Oggi resta
una pagina sola che si riempie durante la giornata. E non ripete le stesse
notizie, perche' gli articoli gia' usati restano esclusi per una settimana.

Come funziona: il workflow si sveglia ogni mezzora e costruisce solo per chi ha una
tornata dovuta in quel momento. Ogni tornata resta dovuta per due ore, ed e' la
rete di sicurezza: se un'esecuzione fallisce, la sveglia dell'ora dopo rimedia.

Di notte non si sveglia. Le ore coperte sono le 04:00-21:00 UTC, che con
l'Italia a UTC+1 d'inverno e UTC+2 d'estate bastano a servire qualunque ora fra
le 6 e le 22 in entrambe le stagioni.

**Quanto consuma.** Un'esecuzione a vuoto dura pochi secondi ma viene contata
come un minuto: 36 al giorno fanno circa 1080 minuti al mese, sui **2000
inclusi** nel piano gratuito per i repository privati. Senza una carta
registrata, a minuti esauriti i job vengono **bloccati, non addebitati**: non
puo' partire nessun pagamento. Conviene attivare le email di avviso al 90% e al
100% nelle impostazioni di fatturazione di GitHub.

## Le notizie adesso, senza aspettare

Dentro l’app, in **Impostazioni** → *Aggiorna adesso*. Funziona per chiunque usi
l’app, anche per chi non ha accesso al repository su GitHub.

**Non e’ istantaneo:** il digest viene preparato entro mezzora. Il motivo e’ che le
notizie non le costruisce l’app ma uno script che gira sui computer di GitHub,
e per farlo partire da dentro l’app servirebbe una chiave di GitHub scritta
nella pagina — leggibile da chiunque apra il sito, visto che il codice e’
pubblico anche se i dati non lo sono. Quindi l’app lascia una richiesta nel
database, e la sveglia successiva la raccoglie e costruisce fuori orario.

Di notte, fra le 23:30 e le 06:00, il workflow non si sveglia: una richiesta
lasciata in quelle ore viene raccolta la mattina dopo. Resta valida 14 ore, un
margine scelto apposta per coprire il buco notturno.

**Sostituisce o si aggiunge?** Dipende da quanto manca alla tornata programmata:

- se premi **entro un’ora** da una tornata programmata, la richiesta prende il suo
  posto e la anticipa. Chiedendo alle 09:15 con la tornata alle 10:00, ricevi
  quella e basta, non due.
- se premi **prima**, e’ una tornata in piu’ e il programma resta. Chiedendo alle
  08:50, ricevi un digest verso le 09:00 e comunque quello delle 10:00.

Conta il momento in cui premi, non quello in cui il sistema si sveglia. E l’app
te lo dice **prima**: sotto il pulsante c’e’ scritto quale dei due casi e’.

Il pulsante resta segnato *Richiesta in corso* finche’ la pipeline non la
raccoglie, e si puo’ annullare. Una richiesta piu’ vecchia di sei ore viene
ignorata, per non trovarsi un digest a sorpresa la mattina dopo.

Se invece il repository lo apri tu, la via immediata resta **Actions** →
*Digest quotidiano* → **Run workflow** con la spunta.

## Se modifichi un topic

Le parole da cercare vengono ricalcolate da sole al primo digest successivo:
la pipeline tiene un'impronta di nome, interessi e lingua del topic, e quando
non corrisponde piu' rifa' la query invece di riusare quella in cache.

Le notizie gia' salvate non cambiano: la modifica vale da li' in avanti.


# Le notifiche (Fase 5)

Quando il digest e’ pronto arriva un avviso sul telefono, nella lingua che hai
scelto: *“Il tuo digest e’ pronto: 23 notizie da 6 topic”*. Toccandolo si apre
la pagina Oggi.

Le chiavi VAPID sono gia’ state generate: la meta’ pubblica sta nel codice
dell’app, la privata solo nel tuo `.env`. Resta da portarle su GitHub.

## 15. Metti le chiavi delle notifiche su GitHub

Su <https://github.com/alessiofalconaro/news/settings/secrets/actions>, tre
nuovi segreti, copiando i valori dal tuo `.env`:

| Name | Secret |
|---|---|
| `VAPID_PUBLIC_KEY` | la riga corrispondente nel `.env` |
| `VAPID_PRIVATE_KEY` | idem |
| `VAPID_SUBJECT` | `mailto:alefalco28@gmail.com` |

Senza questi il digest funziona lo stesso: semplicemente non manda avvisi.

## 16. Attivale sul telefono

**Su iPhone l’app deve essere installata sulla schermata Home.** Dal browser
Safari le notifiche non funzionano proprio, e non e’ un difetto dell’app: Apple
le concede solo alle web app installate.

1. Apri NewsDigest **dall’icona sulla schermata Home**, non da Safari.
2. **Impostazioni** → *Notifiche* → **Attiva le notifiche**.
3. iOS chiede il permesso: concedilo. Compare solo se premi tu il pulsante, non
   si puo’ chiedere da soli.
4. Premi **Mandami una notifica di prova**: deve arrivare subito.

La prova verifica il permesso, il service worker e l’aspetto dell’avviso su quel
telefono. **Non** verifica l’invio dal server: quello viaggia dalla pipeline, e a
provarlo e’ il primo digest vero — o il pulsante *Aggiorna adesso*.

L’attivazione vale **per dispositivo**: se usi l’app anche sul PC, li’ va
attivata di nuovo.

Se hai rifiutato il permesso per sbaglio, il pulsante non basta piu’: si
riattiva da Impostazioni di iOS → NewsDigest → Notifiche.

Le iscrizioni che smettono di funzionare — app disinstallata, telefono
cambiato — vengono cancellate da sole: il servizio di push risponde 404 o 410 e
la pipeline toglie la riga.

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
