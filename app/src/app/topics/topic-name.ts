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
 * The same, for a story: the topic it belongs to, asked first.
 *
 * A story carries its own copy of both names, written when it was saved, and
 * for a while that copy was all this used. It made the digest lag behind the
 * topics page by a round: rename or create a topic and its own page changed
 * language at once, while the section headings and the chips over the stories
 * kept the old wording until the pipeline next wrote some. They are the same
 * topic - so ask the topic, which is where the fresh answer is.
 *
 * The copy on the story is the fallback, and it earns its place: once a topic
 * is deleted there is nothing left to ask, and an archived digest still has to
 * read properly. That is what it was for.
 */
export function storyTopicName(story: Story, lang: Lang, topics: readonly Topic[]): string {
  const live = story.topicId ? topics.find((t) => t.id === story.topicId) : undefined;
  if (live) return topicName(live, lang);
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
