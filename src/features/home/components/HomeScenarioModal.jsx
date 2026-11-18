import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import closeIcon from '../../../assets/icons/scenario-modal-close.svg';
import dialogueFriend from '../../../assets/icons/scenario-dialogue-friend.svg';
import dialogueEmotion from '../../../assets/icons/scenario-dialogue-emotion.svg';
import dialogueKindergarten from '../../../assets/icons/scenario-dialogue.svg';
import dialogueHabit from '../../../assets/icons/scenario-dialogue-habit.svg';
import dialogueTantrum from '../../../assets/icons/scenario-dialogue-tantrum.svg';
import iconInfo from '../../../assets/icons/icon-sample-info.svg';
import sampleStoryCover from '../../../assets/images/sample-story-cover.png';
import bookCoverStyles from '../../story/components/BookCover.module.css';
import StoryReader from '../../story/components/StoryReader';
import { sampleStories } from '../sampleStories';
import { scenarioPopupContent } from '../scenarioPopupContent';
import styles from './HomeScenarioModal.module.css';

// 임시 예시 동화예요. 백엔드가 카드별 표지를 주면 이 값 대신 받은 제목과 표지를 보여줘요. (FirstoryAI/Backend_Mainpage#45)
const PLACEHOLDER_SAMPLE_STORY = { title: '토리와 빨간 블록', coverUrl: sampleStoryCover };

function HomeScenarioModal({ scenario, onClose, onStart }) {
  const dialogRef = useRef(null);
  const coverButtonRef = useRef(null);
  const closeTimerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [samplePage, setSamplePage] = useState(null);
  const [closing, setClosing] = useState(false);
  // 예시 동화는 브라우저 기록에 한 칸을 더해서 열어요. 그래서 브라우저 뒤로가기를 누르면 페이지를 떠나지 않고
  // 예시 동화만 닫혀요. (이 팝업과 읽던 쪽은 그대로 남고, 앞으로가기를 누르면 읽던 쪽이 다시 열려요)
  const readerOpen = samplePage !== null && location.state?.sampleReader === scenario.id;
  const content = scenario.popupContent ?? scenarioPopupContent[scenario.id] ?? scenarioPopupContent.friend;
  const accentStyle = { '--scenario-accent': scenario.accentColor };
  const sampleStory = sampleStories[scenario.id] ?? PLACEHOLDER_SAMPLE_STORY;
  const hasSample = Boolean(sampleStory.pages?.length);
  // 앞·뒤표지가 다 있으면 아이와 읽기처럼 덮인 앞표지(0쪽)로 열고, 마지막 쪽 다음에 뒤표지로 덮어요. (#235)
  const hasCovers = Boolean(sampleStory.coverUrl && sampleStory.backCoverUrl);
  const dialogueIcons = {
    friend: dialogueFriend,
    emotion: dialogueEmotion,
    kindergarten: dialogueKindergarten,
    habit: dialogueHabit,
    tantrum: dialogueTantrum,
  };

  const requestClose = useCallback(() => {
    if (closing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose();
      return;
    }
    setClosing(true);
    closeTimerRef.current = window.setTimeout(onClose, 150);
  }, [closing, onClose]);

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !readerOpen) requestClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readerOpen, requestClose]);

  const openReader = () => {
    setSamplePage(hasCovers ? 0 : 1);
    navigate(`${location.pathname}${location.search}`, { state: { sampleReader: scenario.id } });
  };

  // 닫기 버튼도 뒤로가기와 같게, 예시 동화를 열 때 더한 기록 한 칸을 되돌려요.
  const closeReader = () => {
    navigate(-1);
    requestAnimationFrame(() => coverButtonRef.current?.focus());
  };

  return (
    <div
      className={`${styles.backdrop} ${closing ? styles.closing : ''}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        className={styles.dialog}
        ref={dialogRef}
        tabIndex={-1}
        style={accentStyle}
        role="dialog"
        inert={readerOpen}
        aria-modal="true"
        aria-labelledby="scenario-dialog-title"
        aria-describedby="scenario-dialog-description"
      >
        <button
          className={styles.closeButton}
          type="button"
          onClick={requestClose}
          aria-label="팝업 닫기"
        >
          <img src={closeIcon} alt="" />
        </button>

        <div className={styles.tags}>
          <span>{content.age}</span>
          <span>{content.childTrait}</span>
        </div>

        <h2 className={styles.title} id="scenario-dialog-title">{content.title}</h2>
        <p className={styles.description} id="scenario-dialog-description">
          {content.description.map((line) => <span key={line}>{line}</span>)}
        </p>

        <div className={styles.body}>
          <figure className={styles.sample}>
            {hasSample ? (
              <button
                className={styles.coverButton}
                type="button"
                ref={coverButtonRef}
                onClick={openReader}
                aria-label={`${sampleStory.title} 예시 동화 읽기`}
              >
                <span
                  className={`${styles.coverFrame} ${bookCoverStyles.bookCover}`}
                  style={{ '--cover': `url(${JSON.stringify(sampleStory.coverUrl)})` }}
                >
                  <span className={bookCoverStyles.bookFace}>
                    <span className={bookCoverStyles.bookArt}>
                      <img className={styles.cover} src={sampleStory.coverUrl} alt="" />
                    </span>
                  </span>
                </span>
              </button>
            ) : <img className={styles.cover} src={sampleStory.coverUrl} alt={`${sampleStory.title} 표지`} />}
            <figcaption className={styles.sampleCaption}>
              <img src={iconInfo} alt="" />
              예시 동화 &lt;{sampleStory.title}&gt;
            </figcaption>
          </figure>

          <div className={styles.guide}>
            <div className={styles.guideHeading}>
              <img src={dialogueIcons[scenario.color] ?? dialogueKindergarten} alt="" />
              <h3>{content.guideTitle}</h3>
            </div>

            <ol className={styles.prompts}>
              {content.prompts.map((prompt) => (
                <li className={styles.prompt} key={prompt.title}>
                  <strong>{prompt.title}</strong>
                  <p>{prompt.keepTogether && prompt.question.includes(prompt.keepTogether) ? <>
                    {prompt.question.slice(0, prompt.question.indexOf(prompt.keepTogether))}
                    <span className={styles.noWrap}>{prompt.keepTogether}</span>
                    {prompt.question.slice(prompt.question.indexOf(prompt.keepTogether) + prompt.keepTogether.length)}
                  </> : prompt.question}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <button className={styles.actionButton} type="button" onClick={hasSample ? openReader : onStart}>
          예시 동화 읽어보기 →
        </button>
      </section>
      {readerOpen && (
        <StoryReader
          className={styles.sampleReader}
          title={sampleStory.title}
          pages={sampleStory.pages}
          page={samplePage}
          onPage={setSamplePage}
          onClose={closeReader}
          closeLabel="예시 동화 닫기"
          frontCover={hasCovers ? sampleStory.coverUrl : null}
          backCover={hasCovers ? sampleStory.backCoverUrl : null}
          // 뒤표지로 덮인 뒤에는 닫기 버튼이 보이게 상단바를 내려 둬요.
          keepHeaderShown={hasCovers && samplePage === sampleStory.pages.length + 1}
        />
      )}
    </div>
  );
}

export default HomeScenarioModal;

