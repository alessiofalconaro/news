# NewsDigest: specifica di progetto

> Documento di partenza per Claude Code. Leggilo tutto prima di scrivere codice e lavora per fasi (sezione 11). Alla fine di ogni fase fermati e aspetta la mia conferma. Se qualcosa in questo documento è impossibile, ambiguo o in contraddizione, fermati e chiedimi invece di scegliere da solo. Il nome "NewsDigest" è provvisorio.

## 1. Cos'è

Web app personale (PWA) che ogni mattina alle 10:30 prepara un digest di notizie per i topic scelti da ciascun utente: poche notizie selezionate con criterio, riassunte in italiano e in inglese, con il link all'articolo originale. Quando il digest è pronto manda una notifica push.

- **Utenti:** 2 persone (io e un amico), entrambi con iPhone. L'app non è pubblica.
- **Uso:** principalmente da iPhone, installata sulla schermata Home. Deve funzionare bene anche da PC.
- **Vincolo:** costo zero. Solo piani gratuiti, nessuna carta di credito.
- **Io non programmo su questo progetto:** tutto ciò che devo fare a mano (account, chiavi, configurazioni) spiegamelo passo per passo, in modo semplice.

## 2. Riferimenti grafici

L'aspetto deve essere simile a due mie app esistenti: `budget-tracker` e `dj-calendar`. Le avrò clonate nella stessa cartella che contiene questo progetto e ti avrò lanciato con:

```
claude --add-dir ../budget-tracker --add-dir ../dj-calendar
```

Nella Fase 0 le analizzi e produci `DESIGN.md`. Se una delle due cartelle non è accessibile, fermati e dimmelo: non inventare uno stile.

## 3. Stack

- **Frontend:** lo stesso framework delle app di riferimento. Se le due usano framework diversi, o non è chiaro, fermati e chiedimi. In assenza di indicazioni: Angular.
- **Backend (auth e database):** lo stesso servizio usato dalle app di riferimento (Firebase o Supabase), così riuso account che conosco già. Se nessuna delle due ne usa uno: Supabase. Il resto del documento usa termini Supabase; se si sceglie Firebase, adatta con gli equivalenti.
- **Pipeline notizie:** script Node.js + TypeScript eseguito da GitHub Actions (repository privata).
- **AI:** Gemini API, piano gratuito, con chiave da Google AI Studio. Modello: il Flash-Lite più recente disponibile gratis; verifica il nome esatto nella documentazione ufficiale. Non attivare mai la fatturazione sul progetto Google collegato alla chiave, perché farebbe sparire il piano gratuito.
- **Fonti:** feed RSS di Google News, più feed RSS aggiuntivi opzionali per topic.
- **Notifiche:** Web Push standard (chiavi VAPID), inviate dalla pipeline.
- **Hosting frontend:** lo stesso delle app di riferimento, se gratuito; altrimenti Cloudflare Pages, Netlify o Vercel. Serve HTTPS, altrimenti le notifiche non funzionano.

## 4. Accesso e sicurezza

- Login solo con Google.
- **Allowlist:** possono entrare solo due indirizzi email, salvati nella tabella `allowed_emails`. Chiunque altro vede "Accesso non autorizzato" e non può creare dati. Il controllo va fatto sia nell'interfaccia sia nel database (RLS). Senza allowlist, chiunque trovi l'URL potrebbe consumare la quota gratuita.
- Ogni utente vede e modifica solo i propri dati: RLS attiva su tutte le tabelle.

## 5. Funzionalità v1

### 5.1 Topic

Ogni utente gestisce i propri topic, indipendenti da quelli dell'altro. Non c'è condivisione, nemmeno quando due topic coincidono.

Campi:

- **Nome** (es. "NBA").
- **Cosa mi interessa:** testo libero, es. "partite, mercato e infortuni; niente gossip né polemiche social". È il testo che guida la selezione dell'AI.
- **Parole chiave di ricerca:** opzionali; se vuote, si usa il nome.
- **Lingua delle fonti:** italiano, inglese o entrambe (default: italiano).
- **Feed RSS extra:** opzionali, lista di URL, in una sezione "Avanzate" chiusa di default.
- **Numero di notizie nel digest:** da 3 a 10, default 5.
- **Attivo** sì o no, e **ordine** (riordinabile).

Limite: massimo 10 topic attivi per utente.

### 5.2 Oggi (home)

- Notizie raggruppate per topic, nell'ordine dei topic.
- In alto: chip orizzontali scorrevoli per filtrare un topic ("Tutti" di default).
- **Card notizia:** titolo, riassunto di 2-3 frasi, badge con il numero di fonti ("4 fonti"), orario della notizia più recente.
- **Tocco sulla card:** si espande e mostra l'elenco delle fonti (nome della testata e link) e il bottone "Leggi l'articolo", che apre il link principale in una nuova scheda.
- **Toggle IT/EN nell'header:** cambia all'istante la lingua di tutta l'app, cioè interfaccia, titoli e riassunti, senza ricaricare la pagina (vedi sezione 8.1). La scelta resta salvata nel profilo.
- **Stati da gestire:**
  - digest non ancora pronto (prima delle 10:30);
  - digest parziale: mostra i topic riusciti e un avviso su quelli mancanti;
  - nessuna notizia rilevante per un topic: "Niente di rilevante oggi";
  - caricamento ed errore di rete.

### 5.3 Archivio

Lista dei giorni passati (ultimi 90), dal più recente. Aprire un giorno mostra la stessa vista della home.

### 5.4 Impostazioni

- **Attiva notifiche:** bottone. Il permesso va chiesto solo dopo un tocco dell'utente, mai all'apertura.
- **Su iPhone, se l'app non è aperta dalla schermata Home:** al posto del bottone mostra le istruzioni. In Safari, tocca Condividi, poi "Aggiungi alla schermata Home", poi riapri l'app da lì.
- Invia notifica di prova.
- Lingua dell'app (italiano o inglese), sincronizzata con il toggle nell'header.
- Logout.

### Fuori scope per la v1

Notizie salvate, segna come letto, orario del digest personalizzabile, più digest al giorno, topic condivisi, app nativa iOS.

## 6. Pipeline del digest

Eseguita ogni giorno da GitHub Actions: per ogni utente, per ogni topic attivo, in sequenza.

1. **Raccolta.**
   - Scarica il feed di Google News con le parole chiave del topic:
     - italiano: `https://news.google.com/rss/search?q=<query>&hl=it&gl=IT&ceid=IT:it`
     - inglese: `https://news.google.com/rss/search?q=<query>&hl=en-US&gl=US&ceid=US:en`
     - entrambe: tutti e due i feed.
   - Aggiungi gli eventuali feed extra del topic.
   - Tieni solo gli articoli delle ultime 24 ore.
   - Salva i link di Google News così come sono: reindirizzano all'articolo originale.
2. **Pulizia.** Rimuovi i duplicati (stesso URL o titolo quasi identico) e gli articoli già usati per quel topic negli ultimi 7 giorni (tabella `seen_articles`).
3. **Chiamata AI 1: selezione.**
   - Passa la lista degli articoli (id, titolo, testata, snippet, data) e il testo "Cosa mi interessa".
   - L'AI raggruppa gli articoli che parlano della stessa notizia e scarta ciò che non corrisponde agli interessi.
   - Ordina le storie per rilevanza con questi criteri, in ordine di peso: numero di testate diverse che ne parlano, importanza oggettiva, aderenza agli interessi, recenza.
   - Restituisce le prime N storie, con gli id degli articoli di ciascuna.
   - Output in JSON, validato con uno schema.
4. **Chiamata AI 2: riassunti.**
   - Per le storie selezionate passa titoli e snippet di tutti gli articoli del gruppo.
   - Per ogni storia l'AI restituisce: `headlineIt`, `headlineEn`, `summaryIt`, `summaryEn` (2-3 frasi) e `primaryArticleId` (la fonte più autorevole o completa).
   - Regole da dare all'AI:
     - usa solo le informazioni presenti nei testi forniti, senza inventare fatti;
     - tono neutro;
     - italiano naturale, non tradotto parola per parola;
     - se le informazioni sono scarse, fai un riassunto più breve.
5. **Salvataggio.** Digest del giorno, storie e articoli visti.
6. **Notifica.**
   - A fine elaborazione di ogni utente manda una push nella lingua scelta dall'utente, es. "Il tuo digest è pronto: 23 notizie da 6 topic" oppure "Your digest is ready: 23 stories from 6 topics".
   - Il tocco sulla notifica apre la home di oggi.
   - Le iscrizioni scadute (errore 404 o 410) vanno cancellate.

### Robustezza

- Chiamate AI in sequenza, con una pausa di circa 6 secondi tra una e l'altra: il piano gratuito ha limiti al minuto.
- Su errore 429 o 5xx: nuovo tentativo con attesa crescente, massimo 3 tentativi.
- Se un topic fallisce, si prosegue con gli altri e il digest viene segnato come `partial`. Un singolo errore non deve mai bloccare tutto il job.
- **Idempotenza:** se il digest di oggi per un utente esiste già completo, lo script lo salta.
- Log chiari e leggibili nella console di GitHub Actions.
- **Comando locale** `npm run digest -- --dry-run --user <email>`: esegue tutto e stampa il risultato senza salvare né notificare. Mi serve per giudicare la qualità della selezione.

### Orario

L'obiettivo è le 10:30 ora italiana. Il cron di GitHub usa UTC e in Italia cambia l'ora legale, quindi:

- schedula il workflow sia alle 08:30 sia alle 09:30 UTC;
- lo script prosegue solo se l'ora in `Europe/Rome` è tra le 10:00 e le 12:00 e il digest di oggi non esiste già. Così il secondo avvio fa da riserva se il primo parte in ritardo o fallisce;
- aggiungi `workflow_dispatch` per lanciarlo a mano, con un'opzione `--force` che ignora il controllo dell'orario.

Il cron di GitHub può partire con qualche minuto di ritardo: va bene.

## 7. Database (Supabase)

Nomi di tabelle e colonne in snake_case.

| Tabella | Colonne | Note |
|---|---|---|
| `allowed_emails` | `email` (PK) | |
| `profiles` | `id` (= id utente auth), `email`, `display_name`, `language` ('it' o 'en', default 'it'; vale per tutta l'app), `created_at` | |
| `topics` | `id`, `user_id`, `name`, `interests`, `search_query`, `source_language` ('it', 'en', 'both'), `extra_feeds` (text[]), `max_stories` (3-10), `is_active`, `sort_order`, `created_at`, `updated_at` | |
| `digests` | `id`, `user_id`, `digest_date`, `status` ('ok', 'partial', 'failed'), `created_at` | valore unico su (`user_id`, `digest_date`) |
| `stories` | `id`, `digest_id`, `topic_id`, `topic_name`, `rank`, `headline_it`, `headline_en`, `summary_it`, `summary_en`, `primary_url`, `sources` (jsonb: lista di {name, url}), `source_count`, `latest_published_at` | `topic_id` diventa null se il topic viene cancellato; `topic_name` è copiato perché l'archivio resti leggibile |
| `seen_articles` | `topic_id`, `url_hash`, `first_seen_at` | |
| `push_subscriptions` | `id`, `user_id`, `endpoint` (unico), `p256dh`, `auth`, `created_at` | |

Pulizia automatica fatta dalla pipeline:

- `seen_articles` più vecchi di 14 giorni;
- digest e storie più vecchi di 90 giorni.

Le migrazioni SQL sono versionate in `supabase/migrations`.

## 8. Grafica e responsive

- Tutto lo stile viene da `DESIGN.md` (Fase 0). Se `DESIGN.md` e questo documento sono in conflitto sull'aspetto grafico, vince `DESIGN.md`.
- **Mobile first:** progetta per la larghezza di un iPhone (375-430 px), poi adatta agli schermi più grandi.
- **Mobile:**
  - bottom navigation con 4 voci: Oggi, Archivio, Topic, Impostazioni;
  - rispetta le safe area di iPhone con `env(safe-area-inset-*)`, soprattutto notch e barra home;
  - aree toccabili di almeno 44 px;
  - nessuna interazione affidata solo all'hover.
- **PC (da circa 900 px):** navigazione laterale o in alto, contenuto centrato con una larghezza massima leggibile (circa 720 px per le card).
- Dark mode, se le app di riferimento la supportano.
- Nomi di file, variabili, funzioni, tabelle e commenti nel codice in inglese.

### 8.1 Lingua (italiano e inglese)

L'app è completamente bilingue.

- **Nessun testo scritto direttamente nei componenti:** tutti i testi visibili (voci di menu, bottoni, etichette, messaggi di errore, stati vuoti, istruzioni per iPhone, conferme) stanno in file di traduzione, uno per l'italiano e uno per l'inglese, con le stesse chiavi.
- **Cambio lingua istantaneo** dal toggle nell'header o dalle impostazioni, senza ricaricare la pagina né rifare il login.
- **Lingua iniziale:** al primo accesso si usa quella del browser se è italiano o inglese, altrimenti l'italiano. Dopo si usa quella salvata nel profilo.
- **Date e orari** formattati secondo la lingua scelta (es. "17 settembre" oppure "September 17").
- **Contenuti delle notizie:** titoli e riassunti mostrano la versione nella lingua scelta.
- **Notifiche push:** inviate nella lingua salvata nel profilo.
- **Testi inseriti dall'utente** (nome del topic, "Cosa mi interessa"): non vengono tradotti, restano come scritti.
- Il sistema di traduzioni va impostato nella Fase 1, prima di scrivere le schermate: aggiungerlo dopo significa riscrivere tutti i componenti.

## 9. PWA

- **Manifest:** nome, icone da 192 e 512 px, `apple-touch-icon` da 180 px, `display: standalone`, colori presi da `DESIGN.md`.
- **Service worker:** gestisce le push e il tocco sulle notifiche. Cache minima della struttura dell'app; i dati del digest vanno sempre letti online.
- Meta tag per iOS: colore della status bar e titolo sulla schermata Home.
- **Icona:** semplice e coerente con `DESIGN.md`. Generala tu come SVG e convertila nelle dimensioni richieste.

## 10. Segreti e configurazione

I segreti non vanno mai nel codice né nel repository. Prepara un `.env.example` con l'elenco delle variabili e metti `.env` in `.gitignore`.

- **Frontend (valori pubblici):** URL del progetto Supabase, anon key, chiave VAPID pubblica.
- **Secrets di GitHub Actions:**
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT` (formato `mailto:` con la mia email)

## 11. Fasi di lavoro

Alla fine di ogni fase:

- fermati;
- riassumi in poche righe cosa hai fatto;
- dimmi esattamente cosa devo provare io (su iPhone, quando serve) e cosa devo configurare a mano.

Non passare alla fase successiva senza la mia conferma.

**Fase 0: analisi e design.**
Analizza `../budget-tracker` e `../dj-calendar` e produci `DESIGN.md` con:

- framework e librerie UI usate;
- palette con i codici colore esatti, font, dimensioni del testo;
- spaziature, raggi dei bordi, ombre;
- dark mode, animazioni e transizioni;
- componenti ricorrenti (card, header, navigazione, bottoni, chip, input, liste, stati vuoti e di caricamento) e in quali file si trovano.

Se le due app differiscono, indica le differenze e proponi una sintesi. Poi dimmi quale stack proponi (sezione 3) e perché. In questa fase non si scrive codice dell'app.

**Fase 1: base e accesso.**
Struttura del progetto, sistema di traduzioni italiano e inglese (sezione 8.1) con il toggle funzionante, login Google, allowlist, schema del database con RLS, gestione dei topic (sezione 5.1) e navigazione con le 4 sezioni (vuote dove non ancora pronte). Deploy di prova. Istruzioni per me: creazione del progetto Supabase, del client OAuth di Google e configurazione dell'hosting.

**Fase 2: pipeline in locale.**
Script della pipeline (sezione 6) con `--dry-run`, più le istruzioni per ottenere la chiave Gemini. Io lo provo sui miei topic e ti dico se la selezione è buona; si lavora sui prompt finché non lo è.

**Fase 3: salvataggio e interfaccia.**
Salvataggio su database, home, archivio, toggle della lingua, stati vuoti ed errori.

**Fase 4: automazione.**
Workflow di GitHub Actions con doppio orario e `workflow_dispatch`, più le istruzioni per inserire i secrets.

**Fase 5: PWA e notifiche.**
Manifest, service worker, iscrizione alle push, notifica di prova, notifica a fine digest e istruzioni per iPhone.

**Fase 6: rifinitura.**
Controllo visivo su iPhone e PC. `README.md` in italiano, scritto per chi non programma:

- come funziona l'app;
- come aggiungere un'email all'allowlist;
- come lanciare il digest a mano;
- cosa fare se qualcosa smette di funzionare e dove guardare i log.

## 12. Struttura del repository (indicativa)

```
/app                  frontend
/pipeline             script del digest (Node + TypeScript)
/supabase/migrations  schema del database
/.github/workflows    daily-digest.yml
DESIGN.md
PROJECT_SPEC.md
README.md
```

## 13. Note sui piani gratuiti

- **GitHub Actions:** con la repository privata i minuti gratuiti mensili bastano ampiamente, perché il job dura pochi minuti al giorno.
- **Supabase:** nel piano gratuito i progetti inattivi vengono messi in pausa; la scrittura quotidiana della pipeline mantiene il progetto attivo.
- **Gemini:** il piano gratuito ha limiti per minuto e per giorno, e Google può cambiarli. Con 2 utenti e al massimo 10 topic ciascuno si fanno al massimo 40 chiamate AI al giorno.
