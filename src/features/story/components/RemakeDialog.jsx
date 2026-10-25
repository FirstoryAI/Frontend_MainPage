import { useEffect, useRef, useState } from 'react';
import modalClose from '../../../assets/remake/modal-close.svg';
import radioOff from '../../../assets/remake/radio-off.svg';
import radioRing from '../../../assets/remake/radio-ring.svg';
import radioDot from '../../../assets/remake/radio-dot.svg';
import styles from './RemakeDialog.module.css';

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

// 미리보기 위에 뜨는 '어떤 부분을 다시 만들까요?' 팝업이에요.
// 1440×960 미리보기 화면(캔버스) 안에 놓이도록 만들었어요. 좁은 화면에서는 화면 전체 기준으로 떠요.
function RemakeDialog({ onClose, onRemake }) {
  const dialogRef = useRef(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [request, setRequest] = useState('');

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  const remake = () => {
    if (!selectedOption) {
      return;
    }

    onRemake({ type: selectedOption, request: request.trim() });
  };

  return (
    <>
      <div className={styles.backdrop} />

      <section
        className={styles.dialog}
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remake-dialog-title"
        aria-describedby="remake-dialog-description"
      >
        <button className={styles.dialogClose} type="button" onClick={onClose} aria-label="닫기">
          <img src={modalClose} alt="" />
        </button>

        <h2 id="remake-dialog-title">어떤 부분을 다시 만들까요?</h2>
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
          <button className={styles.cancelButton} type="button" onClick={onClose}>취소</button>
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
    </>
  );
}

export default RemakeDialog;
