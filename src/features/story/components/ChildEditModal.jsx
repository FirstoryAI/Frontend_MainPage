import { useState } from 'react';
import EditModal from './EditModal';
import Chip from './Chip';
import { birthYears, traits as traitOptions } from '../constants';
import { birthYearForAge, calcAge, joinLikes, parseLikes } from '../utils';
import iconClear from '../../../assets/icons/icon-clear.svg';
import iconChipRemove from '../../../assets/icons/icon-chip-remove.svg';
import iconPlusCircle from '../../../assets/icons/icon-plus-circle.svg';
import styles from './ChildEditModal.module.css';

const AGES = Array.from({ length: 13 }, (_, age) => age);

function ChildEditModal({ child, onSave, onClose }) {
  const [age, setAge] = useState(() => calcAge(child.birthYear, child.birthMonth) ?? '');
  const [selectedTraits, setSelectedTraits] = useState(child.traits);
  const [customTrait, setCustomTrait] = useState(child.customTrait);
  const [likes, setLikes] = useState(() => parseLikes(child.likes));
  const [likeInput, setLikeInput] = useState('');

  // 태어난 달은 그대로 두고, 고른 만 나이가 되는 출생 연도 중 선택지에 있는 나이만 보여줘요.
  const ageOptions = AGES.filter((option) =>
    birthYears.includes(birthYearForAge(option, child.birthMonth)),
  );

  const toggleTrait = (trait) => {
    setSelectedTraits((current) =>
      current.includes(trait) ? current.filter((item) => item !== trait) : [...current, trait],
    );
  };

  const addLike = () => {
    const value = likeInput.trim();
    if (value && !likes.includes(value)) {
      setLikes((current) => [...current, value]);
    }
    setLikeInput('');
  };

  const handleLikeKeyDown = (event) => {
    // 한글 입력 조합 중의 Enter는 무시해요.
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      addLike();
    }
  };

  const handleSave = () => {
    const pending = likeInput.trim();
    const nextLikes = pending && !likes.includes(pending) ? [...likes, pending] : likes;

    onSave({
      birthYear: String(birthYearForAge(Number(age), child.birthMonth)),
      traits: selectedTraits,
      customTrait: customTrait.trim(),
      likes: joinLikes(nextLikes),
    });
  };

  return (
    <EditModal
      title="아이"
      titleId="child-edit-title"
      saveDisabled={age === ''}
      onSave={handleSave}
      onClose={onClose}
    >
      <div className={`${styles.row} ${styles.ageRow}`}>
        <label className={styles.label} htmlFor="child-edit-age">
          나이
        </label>
        <div className={styles.ageBox}>
          <select
            className={styles.ageSelect}
            id="child-edit-age"
            value={age}
            onChange={(event) => setAge(Number(event.target.value))}
          >
            <option value="" disabled>
              나이
            </option>
            {ageOptions.map((option) => (
              <option key={option} value={option}>
                만 {option}세
              </option>
            ))}
          </select>
          {age !== '' && (
            <button
              className={styles.clearButton}
              type="button"
              aria-label="나이 지우기"
              onClick={() => setAge('')}
            >
              <img src={iconClear} alt="" />
            </button>
          )}
        </div>
      </div>

      <div className={`${styles.row} ${styles.traitsRow}`}>
        <p className={`${styles.label} ${styles.chipLabel}`} id="child-edit-traits">
          성향
        </p>
        <div className={styles.traitsColumn}>
          <div className={styles.chips} role="group" aria-labelledby="child-edit-traits">
            {traitOptions.map((trait) => (
              <Chip
                key={trait}
                type="checkbox"
                tone="green"
                name="edit-traits"
                value={trait}
                checked={selectedTraits.includes(trait)}
                onChange={() => toggleTrait(trait)}
              >
                {trait}
              </Chip>
            ))}
          </div>
          <div className={styles.customBox}>
            <textarea
              className={styles.customInput}
              name="edit-custom-trait"
              aria-label="성향 직접 입력"
              placeholder="직접 입력"
              value={customTrait}
              onChange={(event) => setCustomTrait(event.target.value)}
            />
            <button
              className={styles.clearButton}
              type="button"
              aria-label="직접 입력 지우기"
              onClick={() => setCustomTrait('')}
            >
              <img src={iconClear} alt="" />
            </button>
          </div>
        </div>
      </div>

      <div className={`${styles.row} ${styles.likesRow}`}>
        <p className={`${styles.label} ${styles.likesLabel} ${styles.chipLabel}`} id="child-edit-likes">
          좋아하는 것
        </p>
        <div className={styles.likesColumn}>
          <ul className={styles.likeChips} aria-labelledby="child-edit-likes">
            {likes.map((like) => (
              <li className={styles.likeChip} key={like}>
                {like}
                <button
                  className={styles.removeButton}
                  type="button"
                  aria-label={`${like} 삭제`}
                  onClick={() => setLikes((current) => current.filter((item) => item !== like))}
                >
                  <img src={iconChipRemove} alt="" />
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.addRow}>
            <input
              className={styles.addInput}
              type="text"
              name="edit-like"
              aria-label="좋아하는 것 추가"
              autoComplete="off"
              value={likeInput}
              onChange={(event) => setLikeInput(event.target.value)}
              onKeyDown={handleLikeKeyDown}
            />
            <button
              className={styles.addButton}
              type="button"
              aria-label="추가"
              onClick={addLike}
            >
              <img src={iconPlusCircle} alt="" />
            </button>
          </div>
        </div>
      </div>
    </EditModal>
  );
}

export default ChildEditModal;
