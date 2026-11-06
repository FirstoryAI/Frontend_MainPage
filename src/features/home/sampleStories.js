import clothesTeethStory from '../../assets/sample-stories/clothesTeeth/story.json';
import emotionStory from '../../assets/sample-stories/emotion/story.json';
import familyApartStory from '../../assets/sample-stories/familyApart/story.json';
import friendStory from '../../assets/sample-stories/friend/story.json';
import friendLeftOutStory from '../../assets/sample-stories/friendLeftOut/story.json';
import kindergartenStory from '../../assets/sample-stories/kindergarten/story.json';
import kindergartenScaredStory from '../../assets/sample-stories/kindergartenScared/story.json';
import tantrumStory from '../../assets/sample-stories/tantrum/story.json';

const sampleImages = import.meta.glob('../../assets/sample-stories/*/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const stories = [
  friendStory,
  friendLeftOutStory,
  emotionStory,
  familyApartStory,
  kindergartenStory,
  kindergartenScaredStory,
  tantrumStory,
  clothesTeethStory,
];

const imageUrl = (cardId, filename) =>
  sampleImages[`../../assets/sample-stories/${cardId}/${filename}`];

export const sampleStories = Object.fromEntries(stories.map((story) => [
  story.cardId,
  {
    title: story.title,
    coverUrl: imageUrl(story.cardId, story.cover),
    pages: story.pages.map((page) => ({
      ...page,
      imageUrl: imageUrl(story.cardId, page.image),
    })),
  },
]));
