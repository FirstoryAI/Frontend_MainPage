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

// 쪽마다 낭독 음성이에요. (audio/page-01.mp3 …, 번호는 pageNo와 같아요) 아이와 읽기의 서버 audioUrl과 같게 쪽마다 한 파일을 틀어요.
const sampleAudios = import.meta.glob('../../assets/sample-stories/*/audio/*.mp3', {
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

const audioUrl = (cardId, pageNo) =>
  sampleAudios[`../../assets/sample-stories/${cardId}/audio/page-${String(pageNo).padStart(2, '0')}.mp3`] ?? null;

export const sampleStories = Object.fromEntries(stories.map((story) => [
  story.cardId,
  {
    title: story.title,
    coverUrl: imageUrl(story.cardId, story.cover),
    // 뒤표지가 있으면 예시 동화도 앞표지부터 펼치고 마지막에 뒤표지로 덮어요. (#235)
    backCoverUrl: story.backCover ? imageUrl(story.cardId, story.backCover) : null,
    pages: story.pages.map((page) => ({
      ...page,
      imageUrl: imageUrl(story.cardId, page.image),
      audioUrl: audioUrl(story.cardId, page.pageNo),
    })),
  },
]));
