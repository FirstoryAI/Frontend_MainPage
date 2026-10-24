import { useEffect, useRef, useState } from 'react';
import clearIcon from '../../../assets/child-info/clear.svg';
import closeIcon from '../../../assets/child-info/close.svg';
import removeIcon from '../../../assets/child-info/chip-remove.svg';
import addIcon from '../../../assets/child-info/add.svg';
import styles from './ChildInfoModal.module.css';
import { childFromAge } from '../childProfile';
import { calcAge, joinLikes, parseLikes } from '../../story/utils';

const traitRows = [
  ['낯선 곳에 시간이 걸려요', '마음이 여려요'],
  ['수줍음이 많아요', '활발해요'],
  ['고집이 있어요', '호기심이 많아요'],
];

function ChildInfoModal({ child, onSave, onClose }) {
  const closeButton = useRef(null);
  const [dialogScale, setDialogScale] = useState(1);
  const currentAge = calcAge(child?.birthYear, child?.birthMonth);
  const [age, setAge] = useState(currentAge === null ? '' : `만 ${currentAge}세`);
  const [selectedTraits, setSelectedTraits] = useState(child?.traits ?? []);
  const [customTrait, setCustomTrait] = useState(child?.customTrait ?? '');
  const [favorites, setFavorites] = useState(parseLikes(child?.likes ?? ''));
  const [newFavorite, setNewFavorite] = useState('');

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButton.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    const updateScale = () => {
      const headerHeight = window.innerWidth <= 760
        ? 76
        : window.innerHeight <= 850 ? 88 : 109;
      const widthScale = window.innerWidth <= 760
        ? (window.innerWidth - 32) / 560
        : window.innerWidth / 1440;
      const heightScale = (window.innerHeight - headerHeight - 32) / 694;
      setDialogScale(Math.max(0.4, Math.min(1, widthScale, heightScale)));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const toggleTrait = (trait) => {
    setSelectedTraits((current) => (
      current.includes(trait)
        ? current.filter((selected) => selected !== trait)
        : [...current, trait]
    ));
  };

  const addFavorite = () => {
    const favorite = newFavorite.trim();
    if (!favorite || favorites.includes(favorite)) return;
    setFavorites((current) => [...current, favorite]);
    setNewFavorite('');
  };

  const saveChanges = () => {
    const updatedChild = childFromAge(age, child ?? {});
    onSave?.({
      ...updatedChild,
      traits: selectedTraits,
      customTrait,
      likes: joinLikes(favorites),
    });
  };

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.dialog}
        style={{ '--dialog-scale': dialogScale }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="child-info-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className={styles.title} id="child-info-title">아이 정보</h2>
        <button
          ref={closeButton}
          className={styles.closeButton}
          type="button"
          onClick={onClose}
          aria-label="아이 정보 닫기"
        >
          <img src={closeIcon} alt="" />
        </button>

        <label className={`${styles.label} ${styles.ageLabel}`} htmlFor="child-age">나이</label>
        <div className={styles.ageField}>
          <input
            id="child-age"
            className={styles.ageInput}
            value={age}
            onChange={(event) => setAge(event.target.value)}
            aria-label="아이 나이"
          />
          {age && (
            <button
              className={styles.clearAge}
              type="button"
              onClick={() => setAge('')}
              aria-label="나이 지우기"
            >
              <img src={clearIcon} alt="" />
            </button>
          )}
        </div>

        <span className={`${styles.label} ${styles.traitLabel}`}>성향</span>
        <div className={styles.traitRows}>
          {traitRows.map((row) => (
            <div className={styles.traitRow} key={row[0]}>
              {row.map((trait) => {
                const selected = selectedTraits.includes(trait);
                return (
                  <button
                    className={`${styles.traitChip} ${selected ? styles.traitSelected : ''}`}
                    type="button"
                    key={trait}
                    aria-pressed={selected}
                    onClick={() => toggleTrait(trait)}
                  >
                    {trait}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className={styles.customTraitField}>
          <textarea
            className={styles.customTraitInput}
            value={customTrait}
            onChange={(event) => setCustomTrait(event.target.value)}
            placeholder="직접 입력"
            aria-label="아이 성향 직접 입력"
          />
          <button
            className={styles.clearCustomTrait}
            type="button"
            onClick={() => setCustomTrait('')}
            aria-label="직접 입력한 성향 지우기"
          >
            <img src={clearIcon} alt="" />
          </button>
        </div>

        <span className={`${styles.label} ${styles.favoritesLabel}`}>좋아하는 것</span>
        <div className={styles.favoriteChips}>
          {favorites.map((favorite) => (
            <span className={styles.favoriteChip} key={favorite}>
              <span>{favorite}</span>
              <button
                type="button"
                onClick={() => setFavorites((current) => current.filter((item) => item !== favorite))}
                aria-label={`${favorite} 삭제`}
              >
                <img src={removeIcon} alt="" />
              </button>
            </span>
          ))}
        </div>
        <div className={styles.favoriteInputRow}>
          <input
            className={styles.favoriteInput}
            value={newFavorite}
            onChange={(event) => setNewFavorite(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addFavorite();
              }
            }}
            aria-label="좋아하는 것 추가 입력"
          />
          <button className={styles.addFavorite} type="button" onClick={addFavorite} aria-label="좋아하는 것 추가">
            <img src={addIcon} alt="" />
          </button>
        </div>

        <button className={styles.saveButton} type="button" onClick={saveChanges}>
          수정하기
        </button>
      </section>
    </div>
  );
}

export default ChildInfoModal;
