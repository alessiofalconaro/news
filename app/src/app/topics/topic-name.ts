import type { Lang, Story, Topic } from '../core/models';

/**
 * A topic's name, in the language the app is being read in.
 *
 * The names are the owner's own words, and until now they were the one thing
 * that did not change when the language did: an English page headed
 * "Geopolitica mondiale". The translation is done once by the pipeline and
 * kept on the topic; this only chooses between what is there.
 *
 * Two reasons to fall back to what was typed. The name may have been edited
 * since - `nameSource` records what the translation was made from, so a
 * mismatch means it describes a name that no longer exists - or the pipeline
 * may not have reached this topic yet, which is the case for the first half
 * hour of any new one. Showing a stale translation would be worse than showing
 * the original: at least the original is what the owner wrote.
 */
export function topicName(topic: Topic, lang: Lang): string {
  if (topic.nameSource !== topic.name) return topic.name;
  return (lang === 'en' ? topic.nameEn : topic.nameIt) || topic.name;
}

/**
 * The same, for a story, which carries its own copy.
 *
 * Copied at the time it was written rather than read from the topic, so an
 * archived digest still reads properly after the topic has been renamed or
 * deleted: it is a record of that morning, and that morning the topic was
 * called this.
 */
export function storyTopicName(story: Story, lang: Lang): string {
  return (lang === 'en' ? story.topicNameEn : story.topicNameIt) || story.topicName;
}

/**
 * Topics whose name the AI could not translate because it is not language.
 *
 * Only counted once the pipeline has actually looked at the name: one it has
 * never seen is not untranslatable, it is merely new, and saying otherwise
 * would accuse the owner of typing nonsense while the queue is still moving.
 */
export function untranslatable(topics: readonly Topic[]): Topic[] {
  return topics.filter((t) => t.nameSource === t.name && t.nameMeaningful === false);
}
