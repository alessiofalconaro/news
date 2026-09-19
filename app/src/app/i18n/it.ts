/**
 * Italian strings. This file is the source of truth for the shape of the
 * dictionary: `en.ts` is typed against it, so a missing or misspelled key is a
 * compile error rather than a blank label at runtime.
 *
 * No visible text may live inside a component (PROJECT_SPEC 8.1).
 */
export const it = {
  app: {
    name: 'NewsDigest',
    tagline: 'Il tuo digest di notizie, agli orari che scegli tu.',
  },

  nav: {
    today: 'Oggi',
    archive: 'Archivio',
    topics: 'Topic',
    settings: 'Impostazioni',
  },

  common: {
    save: 'Salva',
    cancel: 'Annulla',
    delete: 'Elimina',
    edit: 'Modifica',
    add: 'Aggiungi',
    close: 'Chiudi',
    retry: 'Riprova',
    loading: 'Caricamento…',
    saving: 'Salvataggio…',
    all: 'Tutti',
    advanced: 'Avanzate',
    required: 'Campo obbligatorio',
  },

  auth: {
    starting: 'Avvio…',
    checkingAccess: 'Controllo dell’accesso…',
    signInSubtitle: 'App privata su invito. Accedi con il tuo account Google.',
    signInWithGoogle: 'Accedi con Google',
    signOut: 'Esci',
    notAllowedTitle: 'Accesso non autorizzato',
    notAllowedBody:
      'Questo account non è fra quelli abilitati. Se pensi sia un errore, chiedi di essere aggiunto alla lista.',
    signedInAs: (email: string) => `Hai eseguito l’accesso come ${email}.`,
    errorGeneric: 'Accesso non riuscito. Riprova.',
    errorNetwork: 'Rete assente o instabile. Riprova.',
    errorUnauthorizedDomain:
      'Questo sito non è autorizzato per l’accesso: va aggiunto agli Authorized domains in Firebase.',
  },

  today: {
    title: 'Oggi',
    notReadyTitle: 'Il digest sta arrivando',
    notReadyBody: (hours: string) =>
      hours
        ? `Le notizie di oggi vengono preparate alle ${hours}, ora locale di dove ti trovi.`
        : 'Le notizie di oggi vengono preparate agli orari che hai scelto nelle impostazioni.',
    noTopicsTitle: 'Comincia da un topic',
    noTopicsBody:
      'Un topic e’ un argomento che vuoi seguire, descritto a parole tue. Creane uno e il primo digest viene preparato subito, di solito entro mezz’ora: non devi aspettare domattina.',
    comingTitle: 'Sto preparando il tuo digest',
    comingBody:
      'Le notizie arrivano di solito entro mezz’ora, a volte piu’ tardi. Puoi chiudere l’app: se hai attivato le notifiche, ti avviso io.',
    partial: (topics: string) => `Alcuni topic non sono stati elaborati: ${topics}.`,
    noStories: 'Niente di rilevante oggi',
    storyCount: (n: number) => (n === 1 ? '1 notizia' : `${n} notizie`),
    sources: (n: number) => (n === 1 ? '1 fonte' : `${n} fonti`),
    readArticle: 'Leggi l’articolo',
    sourcesTitle: 'Le fonti di questa notizia',
    sourcesBody:
      'Le testate che hanno raccontato lo stesso fatto. La stella segna quella che apre «Leggi l’articolo»: toccala su un’altra per cambiarla. Vale per la lingua in cui stai leggendo, così in inglese ti si apre una testata inglese.',
    sourcesPrimary: 'Predefinita',
    sourcesUse: 'Rendila predefinita',
    sourcesUseError: 'Non sono riuscito a salvare la scelta.',
    filterClear: 'Tutti i topic',
    previousStory: 'Notizia precedente',
    nextStory: 'Notizia successiva',
    moreTopicsLeft: 'Topic precedenti',
    moreTopicsRight: 'Altri topic',
    layoutToList: 'Vedi in elenco',
    layoutToCards: 'Vedi una per volta',
    errorTitle: 'Non riesco a caricare il digest',
    comingSoon: 'Questa sezione arriva nella Fase 3.',
  },

  archive: {
    title: 'Archivio',
    emptyTitle: 'Ancora nessun digest',
    emptyBody: 'Qui trovi i digest dei giorni passati, fino a 90 giorni indietro.',
    comingSoon: 'Questa sezione arriva nella Fase 3.',
  },

  topics: {
    title: 'Topic',
    add: 'Nuovo topic',
    newTitle: 'Nuovo topic',
    editTitle: 'Modifica topic',
    name: 'Nome',
    namePlaceholder: 'Es. NBA',
    interests: 'Cosa mi interessa',
    interestsPlaceholder: 'Es. partite, mercato e infortuni; niente gossip né polemiche social',
    interestsHint:
      'Scrivilo come lo diresti a una persona: è il testo che guida la selezione delle notizie.',
    searchQuery: 'Parole chiave di ricerca',
    searchQueryHint: 'Lascia vuoto per usare il nome del topic.',
    sourceLanguage: 'Lingua delle fonti',
    langIt: 'Italiano',
    langEn: 'Inglese',
    langBoth: 'Entrambe',
    extraFeeds: 'Feed RSS aggiuntivi',
    extraFeedsHint:
      'Opzionale, e quasi sempre da lasciare vuoto: le notizie arrivano gia’ da Google News. Serve per seguire un sito preciso che Google trascura. Un indirizzo per riga, del tipo https://www.esempio.it/rss.xml.',
    maxStories: 'Notizie nel digest',
    active: 'Attivo',
    activeHint:
      'Se lo spegni, il topic resta salvato ma non entra nel digest. Utile per metterne uno da parte senza cancellarlo.',
    inactive: 'In pausa',
    activeCount: (n: number, max: number) => `${n} di ${max} topic attivi`,
    emptyTitle: 'Nessun topic',
    emptyBody:
      'Un topic è un argomento che vuoi seguire. Creane uno: il primo digest viene preparato subito, di solito entro mezz’ora.',
    createFirst: 'Crea il primo topic',
    limitReached: (max: number) =>
      `Hai raggiunto il massimo di ${max} topic attivi. Mettine uno in pausa per aggiungerne un altro.`,
    deleteConfirm: (name: string) =>
      `Vuoi eliminare il topic “${name}”? I digest già archiviati restano leggibili.`,
    nameRequired: 'Dai un nome al topic.',
    interestsRequired: 'Scrivi cosa ti interessa: senza questo la selezione non funziona.',
    invalidFeed: 'Uno dei feed non è un indirizzo valido (deve iniziare con http).',
    notTranslated: (names: string) =>
      `Questi nomi non li ho saputi tradurre e restano come li hai scritti: ${names}. Succede quando il testo non e’ una parola in nessuna lingua.`,
    orderHint:
      'L’ordine conta: il digest segue questa sequenza, e la notifica riporta la prima notizia del primo topic che ne ha.',
    moveUp: 'Sposta su',
    moveDown: 'Sposta giù',
    saveError: 'Non sono riuscito a salvare. Riprova.',
  },

  settings: {
    title: 'Impostazioni',
    language: 'Lingua',
    theme: 'Tema',
    themeDark: 'Scuro',
    themeLight: 'Chiaro',
    digestTime: 'Ora del digest',
    digestTimeHint:
      'A che ora vuoi trovare le notizie pronte, ora locale di dove ti trovi. Vale solo per te.',
    digestFirst: 'Prima tornata',
    digestSecond: 'Seconda tornata',
    digestThird: 'Terza tornata',
    digestNone: 'Nessuna',
    refresh: 'Aggiorna adesso',
    refreshHint:
      'Chiede le notizie fuori orario. Non e’ immediato: il digest viene preparato di solito entro mezz’ora, a volte piu’ tardi.',
    refreshPending: 'Richiesta in corso…',
    refreshWhen: (time: string) => ` Le notizie arrivano verso le ${time}.`,
    refreshReplaces: (hour: string) =>
      `Prenderà il posto della tornata delle ${hour}: non ne riceverai due.`,
    refreshExtraWithNext: (hour: string) =>
      `Sarà una tornata in più: quella delle ${hour} arriva comunque.`,
    refreshExtraOnly: 'Sarà una tornata in più: per oggi il programma è già passato.',
    refreshCancel: 'Annulla la richiesta',
    refreshError: 'Non sono riuscito a inviare la richiesta.',
    notifications: 'Notifiche',
    notificationsHint: 'Un avviso quando il digest e’ pronto, sul telefono.',
    notificationsOn: 'Attive su questo dispositivo',
    notificationsEnable: 'Attiva le notifiche',
    notificationsDisable: 'Disattiva',
    notificationsDenied:
      'Le hai rifiutate. Per riattivarle: Impostazioni di iOS → NewsDigest → Notifiche.',
    notificationsUnsupported:
      'Questo browser non le supporta. Su iPhone devi prima aggiungere l’app alla schermata Home e aprirla da li’.',
    notificationsNotConfigured: 'Non ancora configurate: manca la chiave VAPID (punto 15 del README).',
    account: 'Account',
  },
};

/** Shape every other language must match, exactly. */
export type Dictionary = typeof it;
