import { useEffect, useRef } from 'react';
import closeIcon from '../../../assets/icons/scenario-modal-close.svg';
import dialogueFriend from '../../../assets/icons/scenario-dialogue-friend.svg';
import dialogueEmotion from '../../../assets/icons/scenario-dialogue-emotion.svg';
import dialogueKindergarten from '../../../assets/icons/scenario-dialogue.svg';
import dialogueHabit from '../../../assets/icons/scenario-dialogue-habit.svg';
import { scenarioPopupContent } from '../scenarioPopupContent';
import styles from './HomeScenarioModal.module.css';

function HomeScenarioModal({ scenario, onClose, onStart }) {
  const dialogRef = useRef(null);
  const content = scenario.popupContent ?? scenarioPopupContent[scenario.id] ?? scenarioPopupContent.friend;
  const accentStyle = { '--scenario-accent': scenario.accentColor };
  const dialogueIcons = {
    friend: dialogueFriend,
    emotion: dialogueEmotion,
    kindergarten: dialogueKindergarten,
    habit: dialogueHabit,
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.dialog}
        ref={dialogRef}
        tabIndex={-1}
        style={accentStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scenario-dialog-title"
        aria-describedby="scenario-dialog-description"
      >
        <button
          className={styles.closeButton}
          type="button"
          onClick={onClose}
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

        <div className={styles.guideHeading}>
          <img src={dialogueIcons[scenario.id] ?? dialogueKindergarten} alt="" />
          <h3>{content.guideTitle}</h3>
        </div>

        <ol className={styles.prompts}>
          {content.prompts.map((prompt) => (
            <li className={styles.prompt} key={prompt.title}>
              <strong>{prompt.title}</strong>
              <p>{prompt.question}</p>
            </li>
          ))}
        </ol>

        <div className={styles.closing}>
          <h3>{content.closingTitle}</h3>
          <p>{content.closingDescription}</p>
        </div>

        <button className={styles.actionButton} type="button" onClick={onStart}>
          {content.actionLabel}
        </button>
      </section>
    </div>
  );
}

export default HomeScenarioModal;

