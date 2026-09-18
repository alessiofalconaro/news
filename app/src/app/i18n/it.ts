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
    extraFeedsHint: 'Un indirizzo per riga. Opzionale.',
    maxStories: 'Notizie nel digest',
    active: 'Attivo',
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
    digestTimeHint: 'A che ora vuoi trovare le notizie pronte. Vale solo per te.',
    digestFirst: 'Prima tornata',
    digestSecond: 'Seconda tornata',
    digestNone: 'Nessuna',
    notifications: 'Notifiche',
    notificationsComingSoon: 'Le notifiche arrivano nella Fase 5.',
    account: 'Account',
  },
};

/** Shape every other language must match, exactly. */
export type Dictionary = typeof it;
