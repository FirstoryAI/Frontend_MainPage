import friendStory from '../../assets/sample-stories/friend/story.json';

const friendImages = import.meta.glob('../../assets/sample-stories/friend/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const friendImage = (filename) => friendImages[`../../assets/sample-stories/friend/${filename}`];

export const sampleStories = {
  [friendStory.cardId]: {
    title: friendStory.title,
    coverUrl: friendImage(friendStory.cover),
    pages: friendStory.pages.map((page) => ({
      ...page,
      imageUrl: friendImage(page.image),
    })),
  },
};
