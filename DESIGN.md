# DESIGN.md — NewsDigest

Fase 0 del `PROJECT_SPEC.md`. Due parti:

- **Parte A**: cosa fanno davvero `budget-tracker` e `dj-calendar`, con i valori esatti e i file in cui stanno.
- **Parte B**: il sistema di design di NewsDigest, derivato dai due, con palette e font propri.

In caso di conflitto sull'aspetto grafico tra questo file e `PROJECT_SPEC.md`, vince questo file (sezione 8 dello spec).

---

# Parte A — Le due app di riferimento

## A1. Framework e librerie

Le due app sono **identiche come impalcatura**. Nessuna libreria di UI, nessuna libreria di grafici, nessun framework CSS: tutto scritto a mano.

| | budget-tracker | dj-calendar |
|---|---|---|
| Framework | Angular 21.2, standalone, **zoneless**, **signals** | Angular 21.2, standalone, **zoneless**, **signals** |
| Template | inline nel componente (`template:`) | inline, tranne `app.ts` (`templateUrl`) |
| Stili | globali in `src/styles.scss` + `styles:[]` inline per componente | quasi tutto in `src/styles.scss` (2783 righe), poco inline |
| Control flow | `@if` / `@for` | `@if` / `@for` |
| Backend | Firebase JS SDK diretto (no AngularFire) | Firebase JS SDK diretto (no AngularFire) |
| Persistenza | Firestore + `persistentLocalCache` multi-tab | Firestore + `persistentLocalCache` multi-tab |
| Auth | Google | Google + email/password |
| Hosting | Firebase Hosting | Firebase Hosting |
| PWA | `ngsw-config.json` + auto-reload | `ngsw-config.json` + auto-reload |
| Librerie UI | nessuna | nessuna |
| Grafici | SVG e CSS scritti a mano (`dashboard.ts`) | nessuno |

**Conseguenza per NewsDigest:** non c'è una libreria di componenti da riusare. La somiglianza si ottiene copiando i **token CSS** e i **pattern di markup**, non importando pacchetti.

## A2. Palette

### budget-tracker — `src/styles.scss:3-53`

Nero neutro, accento verde. Sobria, tipo app bancaria.

Scuro (default):

```
--bg #0a0c0f   --surface #131720   --surface-2 #1a1f29   --surface-3 #232934
--border #232a35   --border-soft #1c222c
--text #e7e9ee   --text-soft #8a909c   --text-dim #5a616c
--accent #46c46a (entrate)   --danger #f0625a (uscite)
--giro #5b9cf6   --salva #b98cf2   --warn #e2b13c   --brand #46c46a
```

Chiaro (`body.tema-chiaro`): `--bg #f6f7f9`, `--surface #ffffff`, `--text #131820`, accenti scuriti (`--accent #1a9e4b`, `--danger #d83a32`).

### dj-calendar — `src/styles.scss:7-54`

Blu notte, accento lime acido, con bagliori. Tema "night club".

```
--bg #0b0c14   --surface #14162393 (semitrasparente)   --surface-piena #161828
--text #eef0fa   --text-soft #9aa0bd
--accent #cdf452   --accent-dark #b9e438   --warn #ffc94d   --muted #353a57
--danger #ff7575   --success #7ddf9a   --border #262a40
```

Chiaro: `--bg #eef0f7`, `--accent #94b313`, più due gradienti radiali fissi sul `body` (lime in alto a destra, viola in basso a sinistra).

**Differenza principale:** budget-tracker è piatta e neutra, dj-calendar è satura e usa `text-shadow` / `box-shadow` colorati come effetto "neon". Le due palette non si fondono: vanno prese come due esempi dello **stesso metodo**, non come una base comune.

**Metodo comune, questo sì riusabile:**

1. Tutte le variabili su `:root`, tema chiaro come override su `body.tema-chiaro`.
2. Scala di superfici a gradini (`bg` → `surface` → `surface-2` → `surface-3`), mai colori assoluti nei componenti.
3. Un solo accento di marca, più colori semantici separati (danger, warn, success).
4. `color-scheme: dark` / `light` dichiarato, così i controlli nativi seguono il tema.

## A3. Tipografia

| | budget-tracker | dj-calendar |
|---|---|---|
| Font | **Inter** (Google Fonts, 400-800) | **Unbounded** (display, 500/700) + **Sora** (testo, 400/600/700) |
| Base | `15px`, `line-height 1.5`, `letter-spacing -0.011em` | default del browser, `--font-body` |
| Titoli | `font-weight 700`, `letter-spacing -0.025em`; `h1` a `-0.035em` | `--font-display` su `h1, h2, .brand, .cal-titolo`, `letter-spacing 0.08-0.12em` |
| Numeri | `.num { font-variant-numeric: tabular-nums }` | non usato |
| Rifiniture | `font-feature-settings: 'cv11','ss01'`, antialiasing esplicito | — |

Direzioni opposte e istruttive: budget-tracker **stringe** la spaziatura dei titoli (compatto, moderno), dj-calendar la **allarga** (insegna al neon). Entrambe caricano i font da Google Fonts con `preconnect` in `index.html`.

Dimensioni ricorrenti in budget-tracker: `h1` cifra grande `~1.8rem`, titoli di sezione `1rem`, KPI `1.3rem` (desktop) / `1.05rem` (mobile), testo secondario `0.85rem`, meta `0.78rem`, etichette form `0.8rem`, badge `0.72rem`, label del dock `0.62rem`.

## A4. Spaziature, raggi, ombre

| | budget-tracker | dj-calendar |
|---|---|---|
| Unità | px (4, 6, 8, 10, 12, 14, 16, 18, 24, 40) | rem (0.35, 0.5, 0.6, 0.7, 0.75, 1, 1.25, 1.5, 2.25) |
| Raggi | `--radius 14px`, `--radius-sm 10px`, `--radius-xs 8px`, nav `12px`, pill `999px` | `--radius 14px`, campi e bottoni `9px`, pill `999px` |
| Ombre | `--shadow 0 8px 30px rgba(0,0,0,.28)`, `--shadow-sm 0 2px 8px rgba(0,0,0,.2)` | ombre locali, spesso **colorate** con l'accento |
| Focus | `--ring: 0 0 0 3px color-mix(in srgb, var(--brand) 22%, transparent)` | `outline: 2px solid var(--accent); outline-offset: -1px` |
| Padding card | `18px` | `2.25rem 2rem` (card di login) |
| Larghezza contenuto | `clamp(16px, 4vw, 40px)` di padding laterale | `.content { max-width: 72rem; margin: 0 auto }` |

## A5. Dark mode

Identica come meccanica in entrambe:

- scuro di **default**, chiaro come classe `tema-chiaro` sul `<body>`;
- preferenza salvata in `localStorage`;
- applicata da un servizio: `src/app/ui.ts` (budget-tracker) e `src/app/tema.service.ts` (dj-calendar);
- in dj-calendar il servizio è istanziato nell'`App` root apposta, così il tema vale anche sulle pagine di login.

Nessuna delle due segue `prefers-color-scheme`: la scelta è sempre esplicita dell'utente, con default scuro.

## A6. Animazioni e transizioni

| Elemento | Valore | Dove |
|---|---|---|
| Bottoni | `background .15s`, `transform .06s`, `border-color .15s`; `:active { transform: scale(.985) }` | budget `styles.scss:175-185` |
| Bottone primario dj | `transform .12s`, `box-shadow .12s`, `:hover { translateY(-1px) }` | dj `styles.scss:197-222` |
| Pannelli e drawer | `.26s cubic-bezier(.2,0,0,1)` | budget `menu.ts` |
| Indicatore del dock | `transform .3s cubic-bezier(.34,1.15,.5,1)` (rimbalzo leggero) | budget `app.ts:406` |
| Hamburger → X | `.28s cubic-bezier(.4,0,.2,1)` | budget `app.ts:315-328` |
| Entrata card | `@keyframes salita` — `opacity 0→1`, `translateY(14px)→0`, `.45s ease both` | dj `styles.scss:97-106` |
| Pallino "modificata" | `@keyframes pulsa-mod`, lampeggio lento | dj `styles.scss:85-95` |
| Barra di avanzamento | `width .3s ease` | budget `dashboard.ts` |
| Accessibilità | `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important } }` | budget `styles.scss:305-310` |

Regola implicita rispettata ovunque: si anima **solo `transform` e `opacity`** dove c'è un `backdrop-filter` sotto, per non far ridisegnare la sfocatura a ogni frame (commento esplicito in `app.ts:405`).

## A7. Componenti ricorrenti e dove stanno

| Componente | budget-tracker | dj-calendar |
|---|---|---|
| **Card** | `.card` — `styles.scss:143` | `.auth-card` — `styles.scss:118` |
| **Header/topbar** | `.topbar` fissa solo su mobile, griglia 3 colonne — `app.ts:263-280` | `.topbar` sticky, flex, sempre — `styles.scss:390` |
| **Nav desktop** | `.sidebar` sticky 240px — `app.ts:179-223` | nessuna: tutto nella topbar |
| **Nav mobile** | `.dock` fisso in basso, pill "liquid glass" — `app.ts:363-458` | nessuna |
| **Drawer** | `app-menu`, entra da sinistra — `menu.ts` | nessuno |
| **Bottoni** | `.btn`, `.btn-primary`, `.btn-ghost` — `styles.scss:163-208` | `.btn-primary`, `.btn-inline`, `.btn-ghost`, `.btn-danger`, `.btn-icona` — `styles.scss:197-273` |
| **Chip** | `.chip` (pill, `999px`) — `styles.scss:150` | `.cal-filtro` — `styles.scss:1274` |
| **Badge** | `.icona-cerchio` — `styles.scss:230` | `.stato-badge`, `.mod-badge` — `styles.scss:818-851` |
| **Input** | globali su `input, select, textarea` — `styles.scss:243-285` | `.field` con `span`/`input`/`small` — `styles.scss:150-193` |
| **Liste** | `.recenti` / `.mv`, righe con `border-bottom` — `dashboard.ts` | `.agenda-giorno` — `styles.scss:1434` |
| **Stato vuoto** | `.vuoto` (riga di testo) e `.vuoto-stato` (blocco con titolo) — `piano.ts:319-321` | `.empty-state` — `styles.scss:796` |
| **Caricamento** | testo semplice: `.caricamento` — `app.ts:240` | testo semplice |
| **Messaggi** | — | `.form-error`, `.form-warning`, `.form-success` — `styles.scss:277-299` |
| **Offline** | — | `.offline-banner` — `styles.scss:406` |

Nessuna delle due ha **skeleton di caricamento**: mostrano una riga di testo ("Caricamento del tuo budget…"). Per NewsDigest propongo di aggiungerli (Parte B, §B8): le card di notizia hanno un'altezza prevedibile e il digest si carica dalla rete.

## A8. Mobile: le lezioni già pagate

Sono scritte nei commenti di budget-tracker e valgono per NewsDigest, che gira sugli stessi iPhone. Le riporto perché sono errori già commessi una volta:

1. **Niente `body { position: fixed }` né `overflow: hidden`**: su iOS in modalità standalone rompono il `position: fixed; bottom: 0` della barra inferiore e compare una fascia nera sotto. Si blocca solo l'asse orizzontale (`overflow-x: hidden` + `overscroll-behavior-x: none`). — `styles.scss:65-74`
2. **Il documento scrolla normalmente**: `.layout` è `flex; min-height: 100dvh`, `.main` è `flex: 1` senza scroll interno, la sidebar è `position: sticky`. Niente scroll interni.
3. **Topbar `fixed`, non `sticky`**: con `overflow-x: hidden` sul body, `sticky` si rompe. Serve quindi un `padding-top` compensativo su `.main`.
4. **Safe area come padding *interno*** della barra in basso, così il vetro arriva al bordo fisico dello schermo e non resta una striscia scura.
5. **Input a `font-size: 16px`**: sotto i 16px iOS zooma da solo al focus. Il viewport è `viewport-fit=cover` **senza** `user-scalable=no`.
6. **Tastiera aperta**: si ascolta `visualViewport.resize` e il dock scende fuori schermo (`translateY(160%)`), altrimenti resta appeso a metà.
7. **`touch-action: manipulation`** sul body: niente zoom al doppio tap e niente ritardo di 300ms.
8. **`-webkit-tap-highlight-color: transparent`** su tutti gli elementi toccabili.
9. **Nessun valore dinamico deve uscire dal suo contenitore**: griglie con `minmax(0, 1fr)` (mai `1fr`), testo con `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`, `font-size: clamp(...)` dove il contenuto è imprevedibile.
10. **La PWA iOS non si aggiorna da sola**: serve un servizio che controlli `SwUpdate` all'avvio e a ogni ritorno in primo piano, chiami `activateUpdate()` e poi `location.reload()`. — `aggiornamenti.ts`

---

# Parte B — Il sistema di design di NewsDigest

Stessa impalcatura, stessa meccanica, **palette e font propri**. Identità: quotidiano, editoriale, carta e inchiostro. Distinta dal verde/nero di budget-tracker e dal lime/blu di dj-calendar.

> I valori di questa parte sono una **proposta da confermare** prima della Fase 1.

## B1. Palette

Accento **ruggine** su fondo di inchiostro caldo. Il tema chiaro non è bianco freddo ma carta.

### Scuro (default)

```css
:root {
  --bg: #0d0e11;
  --surface: #16181d;
  --surface-2: #1e2127;
  --surface-3: #272b33;
  --border: #262a32;
  --border-soft: #1d2027;

  --text: #eceef2;
  --text-soft: #9096a1;
  --text-dim: #626875;

  --brand: #e4713c;        /* ruggine: marca e azioni primarie */
  --brand-dark: #d3622d;   /* hover */
  --brand-ink: #1e0d05;    /* testo sopra il ruggine */

  --info: #6f9fe8;         /* link, fonti, elementi neutri cliccabili */
  --success: #4cb782;
  --warn: #e3b23c;
  --danger: #e35d5d;
}
```

### Chiaro (`body.tema-chiaro`)

```css
body.tema-chiaro {
  --bg: #f7f6f3;           /* carta, non bianco */
  --surface: #ffffff;
  --surface-2: #f1efea;
  --surface-3: #e7e4dd;
  --border: #e3e0d9;
  --border-soft: #eeece7;

  --text: #17181c;
  --text-soft: #5e6472;
  --text-dim: #949aa6;

  --brand: #c2551f;
  --brand-dark: #ab4917;
  --brand-ink: #fff6f1;

  --info: #2f6fd0;
  --success: #1f8f5f;
  --warn: #a87708;
  --danger: #c8433f;
  color-scheme: light;
}
```

Contrasto verificato sul testo: `--text` su `--bg` sta ampiamente sopra 7:1 in entrambi i temi; `--text-soft` sopra 4.5:1. Il ruggine si usa come **sfondo** solo con `--brand-ink` sopra, mai testo ruggine su `--surface` per blocchi lunghi.

Colori dei topic: come i colori dei locali in dj-calendar (`serate.service.ts`), ogni topic riceve un colore stabile da una tavolozza con anti-collisione, usato per il pallino accanto al nome. Tavolozza proposta (leggibile su entrambi i temi):

```
#e4713c  #6f9fe8  #4cb782  #b98cf2  #e3b23c  #4fb8c4  #ef7ba1  #8fa65a  #d2694f  #7d8ca8
```

## B2. Tipografia

- **Display** (titoli, headline delle notizie, nome dell'app): **Newsreader** — serif variabile pensata per la lettura di notizie, Google Fonts, pesi 500/600/700. Alternativa se non convince: Fraunces.
- **Testo e interfaccia**: **Inter**, pesi 400/500/600/700 (già usato in budget-tracker: font conosciuto e leggero).

```css
--font-display: 'Newsreader', Georgia, 'Times New Roman', serif;
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

Base come budget-tracker: `15px`, `line-height 1.5`, `letter-spacing -0.011em`, antialiasing esplicito.

Scala:

| Ruolo | Valore | Font |
|---|---|---|
| Titolo di pagina (`h1`) | `1.55rem`, peso 700, `letter-spacing -0.02em` | display |
| Headline della notizia | `1.05rem`, peso 600, `line-height 1.35` | display |
| Titolo di sezione / topic (`h2`) | `1rem`, peso 700 | body |
| Riassunto | `0.92rem`, `line-height 1.55`, colore `--text-soft` | body |
| Meta (ora, testata) | `0.78rem`, colore `--text-dim` | body |
| Etichetta form | `0.8rem`, peso 500, colore `--text-soft` | body |
| Badge fonti | `0.72rem`, peso 700 | body |
| Voce del bottom nav | `0.62rem`, peso 700 | body |
| Input | **`16px` obbligatorio** (zoom iOS) | body |

Il riassunto è il testo che si legge davvero: `max-width` della colonna a 720px (spec §8) e `line-height 1.55`, più generoso del `1.5` di budget-tracker.

## B3. Spaziature, raggi, ombre

Scala in px come budget-tracker: `4, 6, 8, 10, 12, 14, 16, 18, 24, 32, 40`.

```css
--radius: 14px;      /* card */
--radius-sm: 10px;   /* bottoni, input */
--radius-xs: 8px;
--radius-pill: 999px;

--shadow: 0 8px 30px rgba(0, 0, 0, 0.28);
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
--ring: 0 0 0 3px color-mix(in srgb, var(--brand) 22%, transparent);

--safe-top: env(safe-area-inset-top, 0px);
--safe-bottom: env(safe-area-inset-bottom, 0px);
```

Nel tema chiaro le ombre diventano `rgba(30, 25, 20, 0.08)` / `rgba(30, 25, 20, 0.06)`, come fa budget-tracker.

Padding: card `16px` su mobile, `18px` da 900px. Gap fra card `12px`. Padding laterale della pagina `clamp(14px, 4vw, 40px)`.

## B4. Breakpoint e layout

- **Breakpoint unico: `900px`** (spec §8: "PC da circa 900 px"). Nota: le app di riferimento usano `820px`; qui seguo lo spec.
- **Colonna di lettura: `max-width: 720px`**, centrata (spec §8).
- Sotto i `900px`: topbar fissa in alto, bottom nav fissa in basso, contenuto a tutta larghezza.
- Da `900px`: sidebar sticky di `240px` a sinistra, contenuto centrato a `720px`, niente bottom nav, niente topbar.
- A `≤360px`: le griglie scendono a una colonna.

Modello di scroll: **identico a budget-tracker** (punti A8.1-A8.4). Non reinventarlo.

## B5. Navigazione

**Mobile** — bottom nav a **4 voci**, senza FAB centrale (a differenza di budget-tracker: qui non c'è un'azione di creazione globale, i topic si creano dentro la loro sezione).

| Voce | Rotta | Icona |
|---|---|---|
| Oggi | `/` | 📰 |
| Archivio | `/archive` | 🗂️ |
| Topic | `/topics` | 🏷️ |
| Impostazioni | `/settings` | ⚙️ |

Si riusa l'intero meccanismo del dock di budget-tracker (`app.ts:470-666`): pill "liquid glass" con `backdrop-filter`, indicatore scorrevole che si misura sul DOM reale, trascinamento del dito fra le voci, annullamento sul gesto verticale, dock che scende quando si apre la tastiera. Con 4 voci e nessun FAB il calcolo dell'indicatore si semplifica.

Aree toccabili: minimo **44px** (spec §8). Le voci del dock a 4 su 375px stanno a ~93px l'una: ampiamente sopra.

**Topbar mobile** — griglia a 3 colonne, senza hamburger (le 4 sezioni sono tutte nel dock, quindi non serve un drawer):

```
[ IT | EN ]        NewsDigest        [ ☀️/🌙 ]
```

Il toggle lingua è un segmented control compatto a due stati, non una tendina: due tocchi al giorno, deve costare un tocco solo. Il titolo al centro è un `<button>` che porta a Oggi o scrolla in cima, come in budget-tracker.

**Desktop** — sidebar sticky di 240px: nome dell'app, le 4 voci, e in fondo toggle lingua, toggle tema, Esci.

## B6. Anatomia della card notizia

Il componente centrale dell'app. Chiusa:

```
┌──────────────────────────────────────────┐
│ Headline su due righe al massimo         │  display 1.05rem/600
│ Riassunto di 2-3 frasi, colore soft,     │  body 0.92rem, --text-soft
│ fino a tre righe poi sfuma.              │
│ ● 4 fonti          08:12                 │  badge + meta 0.78rem
└──────────────────────────────────────────┘
```

- Card = `.card` (superficie `--surface`, bordo `--border`, raggio `14px`).
- Badge fonti: pill `--surface-2` con bordo `--border`, numero in `--text`, parola in `--text-soft`.
- Orario a destra in `--text-dim`, `tabular-nums`.
- Tutta la card è un `<button>`: tocco = espansione (spec §5.2), con `aria-expanded`.

Espansa: sotto il riassunto compare l'elenco delle fonti (nome testata come link in `--info`) e il bottone **"Leggi l'articolo"** (`.btn-primary`, larghezza piena su mobile) che apre il link principale in una nuova scheda. L'espansione anima `grid-template-rows: 0fr → 1fr` (transizione fluida senza calcolare altezze) in `.28s cubic-bezier(.2,0,0,1)`.

Raggruppamento: le card stanno sotto un'intestazione di topic (pallino colorato + nome + contatore), nell'ordine dei topic.

## B7. Chip dei topic

Novità rispetto alle due app di riferimento, richiesta dallo spec §5.2: fila orizzontale scorrevole sotto la topbar.

```css
.chip-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;            /* niente barra visibile su mobile */
  padding: 10px clamp(14px, 4vw, 40px);
  margin-inline: calc(-1 * clamp(14px, 4vw, 40px));  /* sfonda il padding: scorre da bordo a bordo */
}
.chip-row::-webkit-scrollbar { display: none; }
.chip { scroll-snap-align: start; white-space: nowrap; }
.chip.att { background: var(--brand); color: var(--brand-ink); border-color: transparent; }
```

Base `.chip` uguale a budget-tracker (`styles.scss:150`): pill `999px`, `--surface-2`, bordo `--border`, `0.85rem`. Primo chip sempre "Tutti"/"All". Altezza minima `36px`, ma con `padding` verticale che porta l'area toccabile a 44px.

## B8. Stati

| Stato | Resa |
|---|---|
| **Caricamento** | Skeleton: 3 card fantasma con barre `--surface-2` e shimmer `1.4s` in `translateX`. Sospeso da `prefers-reduced-motion`. |
| **Digest non ancora pronto** | Blocco centrato: icona, "Il digest di oggi arriva alle 10:30", ora corrente, e un rimando all'ultimo digest disponibile. |
| **Digest parziale** | I topic riusciti normalmente + banner `--warn` in cima, stile `.offline-banner` di dj-calendar (`styles.scss:406`): fondo `color-mix(in srgb, var(--warn) 12%, var(--bg))`, bordo inferiore `--warn`. Elenca i topic mancanti. |
| **Topic senza notizie** | Riga discreta sotto l'intestazione del topic, `--text-soft`, corsivo: "Niente di rilevante oggi". Niente card vuota. |
| **Nessun topic creato** | `.empty-state` centrato con titolo, spiegazione e `.btn-primary` "Crea il primo topic". |
| **Errore di rete** | Blocco `--danger` con messaggio e bottone "Riprova". |
| **Offline** | Banner come dj-calendar. |
| **Non autorizzato** (fuori allowlist) | Schermata piena, nessuna navigazione, solo messaggio e "Esci". |

Tutti i testi passano dal sistema di traduzioni (spec §8.1): **nessuna stringa scritta nei componenti**, neanche negli stati vuoti.

## B9. PWA e icona

- `theme_color` e `background_color`: **`#0d0e11`** (il `--bg` scuro).
- `display: standalone`, `orientation: portrait`, `lang` dinamico.
- Meta iOS: `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-mobile-web-app-title: NewsDigest`.
- Icona: proposta un **quadrato ruggine `#e4713c` con raggio 22%** e sopra, in bianco caldo `#fff6f1`, tre righe orizzontali di lunghezza decrescente (colonna di giornale) tagliate da una barra verticale. Semplice, leggibile a 48px, coerente con la palette. Generata come SVG e convertita a 180/192/512 px (più una 512 maskable con margine di sicurezza del 20%) con `sharp`, come `tools/genera-icone.mjs` nelle due app di riferimento.

## B10. Regole non negoziabili

1. Nessun colore assoluto nei componenti: sempre variabili CSS.
2. Nessuna stringa visibile nei componenti: sempre chiavi di traduzione.
3. Input a `16px`.
4. Aree toccabili ≥ 44px.
5. Griglie con `minmax(0, 1fr)`, testo variabile con ellissi.
6. Si animano solo `transform` e `opacity` sopra i `backdrop-filter`.
7. `@media (prefers-reduced-motion: reduce)` disattiva tutto.
8. Nessuna interazione affidata al solo hover.
9. Il modello di scroll di A8 non si tocca.
