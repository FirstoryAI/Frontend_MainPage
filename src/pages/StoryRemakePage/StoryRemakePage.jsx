import { useLayoutEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import storyPreview from '../../assets/remake/story-preview.png';
import pageArrowLeft from '../../assets/remake/page-arrow-left.svg';
import pageArrowRight from '../../assets/remake/page-arrow-right.svg';
import noticeDot from '../../assets/remake/notice-dot.svg';
import modalClose from '../../assets/remake/modal-close.svg';
import radioOff from '../../assets/remake/radio-off.svg';
import radioRing from '../../assets/remake/radio-ring.svg';
import radioDot from '../../assets/remake/radio-dot.svg';
import headerClose from '../../assets/remake/header-close.svg';
import styles from './StoryRemakePage.module.css';

const remakeOptions = [
  {
    value: 'all',
    title: '처음부터 다시 만들기',
    description: '주인공과 줄거리부터 새로 짜요. 글과 그림도 새로 나와요.',
  },
  {
    value: 'text',
    title: '글',
    description: '줄거리는 그대로 두고 문장을 다시 써요. 그림도 새로 그려요.',
  },
  {
    value: 'image',
    title: '그림만',
    description: '글은 그대로 두고 그림만 다시 그려요.',
  },
];

const PREVIEW_WIDTH = 1440;
const PREVIEW_HEIGHT = 845;
const DIALOG_WIDTH = 689;
const DIALOG_HEIGHT = 721;

function getScaledLayout() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const headerHeight = viewportWidth <= 600 ? 76 : viewportWidth <= 820 ? 88 : 115;
  const previewScale = Math.min(
    1,
    viewportWidth / PREVIEW_WIDTH,
    Math.max(0.1, (viewportHeight - headerHeight) / PREVIEW_HEIGHT),
  );

  if (viewportWidth <= 600) {
    return { headerHeight, previewScale, dialogScale: 1, dialogTop: 88 };
  }

  const dialogScale = Math.min(
    1,
    (viewportWidth - 32) / DIALOG_WIDTH,
    Math.max(0.1, (viewportHeight - headerHeight - 24) / DIALOG_HEIGHT),
  );
  const centeredTop =
    headerHeight + (viewportHeight - headerHeight - DIALOG_HEIGHT * dialogScale) / 2;
  const dialogTop = Math.max(headerHeight + 12, Math.min(150, centeredTop));

  return { headerHeight, previewScale, dialogScale, dialogTop };
}

function PageNumber({ number }) {
  return (
    <button
      className={`${styles.pageNumber} ${number === 3 ? styles.currentPage : ''}`}
      type="button"
      aria-label={`${number}쪽 미리보기`}
      aria-current={number === 3 ? 'page' : undefined}
    >
      {number}
      {number === 7 && <img className={styles.noticeDot} src={noticeDot} alt="수정 필요" />}
    </button>
  );
}

function RadioMark({ checked }) {
  if (!checked) {
    return <img className={styles.radio} src={radioOff} alt="" />;
  }

  return (
    <span className={styles.checkedRadio} aria-hidden="true">
      <img src={radioRing} alt="" />
      <img className={styles.radioDot} src={radioDot} alt="" />
    </span>
  );
}

function StoryRemakePage() {
  const navigate = useNavigate();
  const { storyId } = useParams();
  const [selectedOption, setSelectedOption] = useState('');
  const [request, setRequest] = useState('');
  const [scaledLayout, setScaledLayout] = useState(() => getScaledLayout());

  useLayoutEffect(() => {
    const updateLayout = () => setScaledLayout(getScaledLayout());

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const close = () => navigate('/library');

  const remake = () => {
    if (!selectedOption) {
      return;
    }

    navigate('/story/new', {
      state: {
        remake: {
          storyId,
          type: selectedOption,
          request: request.trim(),
        },
      },
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} to="/" aria-label="FIRSTORY 홈">
          FIRSTORY
        </Link>
        <button className={styles.headerClose} type="button" onClick={close} aria-label="서재로 돌아가기">
          <img src={headerClose} alt="" />
        </button>
      </header>

      <main
        className={styles.preview}
        aria-hidden="true"
        inert
        style={{
          '--preview-scale': scaledLayout.previewScale,
          '--preview-top': `${scaledLayout.headerHeight}px`,
        }}
      >
        <aside className={styles.pageList}>
          <h1>미리보기</h1>
          <div className={styles.pageNumbers}>
            {Array.from({ length: 10 }, (_, index) => (
              <PageNumber number={index + 1} key={index + 1} />
            ))}
          </div>
        </aside>

        <section className={styles.bookPanel}>
          <img className={styles.storyPreview} src={storyPreview} alt="" />
          <div className={styles.pagination}>
            <button type="button">
              <img src={pageArrowLeft} alt="" />
              이전 쪽
            </button>
            <strong>3 / 10</strong>
            <button type="button">
              다음 쪽
              <img src={pageArrowRight} alt="" />
            </button>
          </div>
        </section>

        <aside className={styles.confirmPanel}>
          <h2>확정하기 전에</h2>
          <div className={styles.confirmActions}>
            <button className={styles.confirmButton} type="button">이대로 확정</button>
            <button className={styles.underlyingRemakeButton} type="button">다시 만들기</button>
            <p>다시 만들기는 1회 가능해요</p>
          </div>
        </aside>
      </main>

      <div className={styles.backdrop} />

      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remake-dialog-title"
        aria-describedby="remake-dialog-description"
        style={{
          '--dialog-scale': scaledLayout.dialogScale,
          '--dialog-top': `${scaledLayout.dialogTop}px`,
        }}
      >
        <button className={styles.dialogClose} type="button" onClick={close} aria-label="닫기">
          <img src={modalClose} alt="" />
        </button>

        <h1 id="remake-dialog-title">어떤 부분을 다시 만들까요?</h1>
        <p className={styles.dialogDescription} id="remake-dialog-description">
          다시 만드는데 3~4분쯤 걸려요
        </p>

        <fieldset className={styles.optionList}>
          <legend className={styles.srOnly}>다시 만들 부분</legend>
          {remakeOptions.map((option) => {
            const selected = selectedOption === option.value;

            return (
              <label
                className={`${styles.optionCard} ${selected ? styles.optionCardSelected : ''}`}
                key={option.value}
              >
                <input
                  type="radio"
                  name="remake-option"
                  value={option.value}
                  checked={selected}
                  onChange={(event) => setSelectedOption(event.target.value)}
                />
                <RadioMark checked={selected} />
                <span className={styles.optionCopy}>
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className={styles.requestField}>
          <label htmlFor="remake-request">
            어떻게 바꾸면 좋을까요?
            <span>선택</span>
          </label>
          <textarea
            id="remake-request"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            placeholder="예) 친구가 먼저 사과하는 장면은 빼주세요."
            rows="2"
          />
        </div>

        <div className={styles.dialogActions}>
          <button className={styles.cancelButton} type="button" onClick={close}>취소</button>
          <button
            className={styles.remakeButton}
            type="button"
            onClick={remake}
            aria-disabled={!selectedOption}
          >
            다시 만들기
          </button>
        </div>
      </section>
    </div>
  );
}

export default StoryRemakePage;
