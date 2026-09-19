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
    tagline: 'Il tuo digest di notizie, ogni mattina alle 10:30.',
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
    notReadyBody: 'Le notizie di oggi vengono preparate ogni mattina intorno alle 10:30.',
    partial: (topics: string) => `Alcuni topic non sono stati elaborati: ${topics}.`,
    noStories: 'Niente di rilevante oggi',
    storyCount: (n: number) => (n === 1 ? '1 notizia' : `${n} notizie`),
    sources: (n: number) => (n === 1 ? '1 fonte' : `${n} fonti`),
    readArticle: 'Leggi l’articolo',
    sourcesTitle: 'Le fonti di questa notizia',
    sourcesBody:
      'Le testate che hanno raccontato lo stesso fatto. «Leggi l’articolo» apre quella predefinita, scelta dall’AI; tocca «Usa questa» su un’altra e da lì in poi aprirà quella.',
    sourcesPrimary: 'Predefinita',
    sourcesUse: 'Usa questa',
    sourcesUseError: 'Non sono riuscito a salvare la scelta.',
    filterClear: 'Tutti i topic',
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
      'Un topic è un argomento che vuoi seguire. Creane uno e domattina trovi le notizie che lo riguardano.',
    createFirst: 'Crea il primo topic',
    limitReached: (max: number) =>
      `Hai raggiunto il massimo di ${max} topic attivi. Mettine uno in pausa per aggiungerne un altro.`,
    deleteConfirm: (name: string) =>
      `Vuoi eliminare il topic “${name}”? I digest già archiviati restano leggibili.`,
    nameRequired: 'Dai un nome al topic.',
    interestsRequired: 'Scrivi cosa ti interessa: senza questo la selezione non funziona.',
    invalidFeed: 'Uno dei feed non è un indirizzo valido (deve iniziare con http).',
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
    digestNone: 'Nessuna',
    refresh: 'Aggiorna adesso',
    refreshHint:
      'Chiede le notizie fuori orario. Non e’ immediato: il digest viene preparato entro mezz’ora.',
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
    notificationsTest: 'Mandami una notifica di prova',
    notificationsTestTitle: 'NewsDigest',
    notificationsTestBody: 'Se leggi questo, le notifiche funzionano.',
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
