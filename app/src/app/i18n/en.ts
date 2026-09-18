import type { Dictionary } from './it';

/** English strings. Typed against the Italian dictionary: same keys, always. */
export const en: Dictionary = {
  app: {
    name: 'NewsDigest',
    tagline: 'Your news digest, every morning at 10:30.',
  },

  nav: {
    today: 'Today',
    archive: 'Archive',
    topics: 'Topics',
    settings: 'Settings',
  },

  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    close: 'Close',
    retry: 'Try again',
    loading: 'Loading…',
    saving: 'Saving…',
    all: 'All',
    advanced: 'Advanced',
    required: 'Required field',
  },

  auth: {
    starting: 'Starting…',
    checkingAccess: 'Checking access…',
    signInSubtitle: 'Private app, invite only. Sign in with your Google account.',
    signInWithGoogle: 'Sign in with Google',
    signOut: 'Sign out',
    notAllowedTitle: 'Access not allowed',
    notAllowedBody:
      'This account is not on the allowed list. If you think that is a mistake, ask to be added.',
    signedInAs: (email: string) => `You are signed in as ${email}.`,
    errorGeneric: 'Sign-in failed. Please try again.',
    errorNetwork: 'No network, or an unstable one. Please try again.',
    errorUnauthorizedDomain:
      'This site is not authorised for sign-in: it must be added to the Authorized domains in Firebase.',
  },

  today: {
    title: 'Today',
    notReadyTitle: 'Your digest is on its way',
    notReadyBody: 'Today’s stories are prepared every morning around 10:30.',
    partial: (topics: string) => `Some topics could not be processed: ${topics}.`,
    noStories: 'Nothing relevant today',
    storyCount: (n: number) => (n === 1 ? '1 story' : `${n} stories`),
    sources: (n: number) => (n === 1 ? '1 source' : `${n} sources`),
    readArticle: 'Read the article',
    errorTitle: 'I cannot load the digest',
    comingSoon: 'This section arrives in Phase 3.',
  },

  archive: {
    title: 'Archive',
    emptyTitle: 'No digests yet',
    emptyBody: 'Past digests show up here, going back up to 90 days.',
    comingSoon: 'This section arrives in Phase 3.',
  },

  topics: {
    title: 'Topics',
    add: 'New topic',
    newTitle: 'New topic',
    editTitle: 'Edit topic',
    name: 'Name',
    namePlaceholder: 'e.g. NBA',
    interests: 'What I care about',
    interestsPlaceholder: 'e.g. games, trades and injuries; no gossip or social media rows',
    interestsHint:
      'Write it the way you would say it to a person: this is the text that drives the selection.',
    searchQuery: 'Search keywords',
    searchQueryHint: 'Leave empty to use the topic name.',
    sourceLanguage: 'Source language',
    langIt: 'Italian',
    langEn: 'English',
    langBoth: 'Both',
    extraFeeds: 'Extra RSS feeds',
    extraFeedsHint:
      'Optional, and usually best left empty: the news already comes from Google News. Use it to follow a specific site Google overlooks. One address per line, like https://www.example.com/rss.xml.',
    maxStories: 'Stories in the digest',
    active: 'Active',
    activeHint:
      'Turning this off keeps the topic but leaves it out of the digest. Useful to set one aside without deleting it.',
    inactive: 'Paused',
    activeCount: (n: number, max: number) => `${n} of ${max} active topics`,
    emptyTitle: 'No topics yet',
    emptyBody:
      'A topic is a subject you want to follow. Create one and tomorrow morning you will find its stories here.',
    createFirst: 'Create your first topic',
    limitReached: (max: number) =>
      `You have reached the maximum of ${max} active topics. Pause one to add another.`,
    deleteConfirm: (name: string) =>
      `Delete the topic “${name}”? Digests already archived stay readable.`,
    nameRequired: 'Give the topic a name.',
    interestsRequired: 'Write what you care about: the selection does not work without it.',
    invalidFeed: 'One of the feeds is not a valid address (it must start with http).',
    moveUp: 'Move up',
    moveDown: 'Move down',
    saveError: 'I could not save that. Please try again.',
  },

  settings: {
    title: 'Settings',
    language: 'Language',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    digestTime: 'Digest time',
    digestTimeHint: 'When you want the news ready. It applies to you only.',
    digestFirst: 'First round',
    digestSecond: 'Second round',
    digestNone: 'None',
    refresh: 'Refresh now',
    refreshHint:
      'Asks for the news outside the schedule. Not instant: the digest is built within half an hour.',
    refreshPending: 'Request in progress…',
    refreshReplaces: (hour: string) =>
      `It will take the place of the ${hour} round: you will not get two.`,
    refreshExtraWithNext: (hour: string) =>
      `It will be an extra round: the ${hour} one still arrives.`,
    refreshExtraOnly: 'It will be an extra round: today’s schedule has already passed.',
    refreshCancel: 'Cancel the request',
    refreshError: 'I could not send the request.',
    notifications: 'Notifications',
    notificationsHint: 'A heads-up on your phone when the digest is ready.',
    notificationsOn: 'On for this device',
    notificationsEnable: 'Turn notifications on',
    notificationsDisable: 'Turn off',
    notificationsTest: 'Send me a test notification',
    notificationsTestTitle: 'NewsDigest',
    notificationsTestBody: 'If you can read this, notifications work.',
    notificationsDenied:
      'You refused them. To allow again: iOS Settings → NewsDigest → Notifications.',
    notificationsUnsupported:
      'This browser does not support them. On iPhone, add the app to the Home Screen first and open it from there.',
    notificationsNotConfigured: 'Not set up yet: the VAPID key is missing (README step 15).',
    account: 'Account',
  },
};
