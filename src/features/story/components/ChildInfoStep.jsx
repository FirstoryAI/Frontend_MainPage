import MascotBubble from './MascotBubble';
import Chip from './Chip';
import { birthMonths, birthYears, genders, traits } from '../constants';
import iconChevron from '../../../assets/icons/icon-chevron-down.svg';
import iconInfo from '../../../assets/icons/icon-info.svg';
import form from './FormControls.module.css';
import styles from './ChildInfoStep.module.css';

function SelectBox({ id, label, value, placeholder, onChange, children, className }) {
  return (
    <div className={`${styles.selectBox} ${className}`}>
      <select
        className={`${styles.select} ${value ? '' : styles.placeholder}`}
        id={id}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {children}
      </select>
      <img className={styles.chevron} src={iconChevron} alt="" />
    </div>
  );
}

function ChildInfoStep({ child, onChange }) {
  const toggleTrait = (trait) => {
    const next = child.traits.includes(trait)
      ? child.traits.filter((item) => item !== trait)
      : [...child.traits, trait];
    onChange({ traits: next });
  };

  return (
    <div className={styles.step}>
      <MascotBubble
        className={styles.intro}
        title="아이에 대해 알려 주세요."
        description="좋아하는 것은 주인공 동물과 그림 소재로 쓰여요. 이름과 사진은 받지 않아요."
      />

      <div className={styles.topRow}>
        <div>
          <p className={form.label}>생년월일</p>
          <div className={styles.birth}>
            <SelectBox
              id="child-birth-year"
              label="태어난 해"
              value={child.birthYear}
              placeholder="연도"
              className={styles.year}
              onChange={(birthYear) => onChange({ birthYear })}
            >
              {birthYears.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </SelectBox>
            <SelectBox
              id="child-birth-month"
              label="태어난 달"
              value={child.birthMonth}
              placeholder="월"
              className={styles.month}
              onChange={(birthMonth) => onChange({ birthMonth })}
            >
              {birthMonths.map((month) => (
                <option key={month} value={month}>
                  {month}월
                </option>
              ))}
            </SelectBox>
          </div>
        </div>

        <div>
          <p className={form.label} id="gender-label">
            성별
          </p>
          <div className={styles.genders} role="radiogroup" aria-labelledby="gender-label">
            {genders.map((gender) => (
              <Chip
                key={gender}
                name="gender"
                value={gender}
                checked={child.gender === gender}
                onChange={() => onChange({ gender })}
              >
                {gender}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.traitsField}>
        <div className={styles.traitsHeading}>
          <p className={`${form.label} ${styles.inline}`} id="traits-label">
            평소 어떤 아이인가요?
          </p>
          <span className={styles.hint}>*중복 선택 가능</span>
        </div>
        <div className={styles.traits} role="group" aria-labelledby="traits-label">
          {traits.map((trait) => (
            <Chip
              key={trait}
              type="checkbox"
              name="traits"
              value={trait}
              checked={child.traits.includes(trait)}
              onChange={() => toggleTrait(trait)}
            >
              {trait}
            </Chip>
          ))}
        </div>
        <input
          className={`${form.control} ${form.textInput} ${styles.strongBorder} ${styles.customTrait}`}
          type="text"
          name="customTrait"
          aria-label="평소 모습 직접 입력"
          placeholder="직접 입력"
          value={child.customTrait}
          onChange={(event) => onChange({ customTrait: event.target.value })}
        />
      </div>

      <div className={styles.likesField}>
        <label className={form.label} htmlFor="child-likes">
          아이가 좋아하는 것
        </label>
        <input
          className={`${form.control} ${form.textInput} ${styles.strongBorder}`}
          id="child-likes"
          name="likes"
          type="text"
          placeholder="예) 파란색, 기차"
          value={child.likes}
          onChange={(event) => onChange({ likes: event.target.value })}
        />
        <p className={styles.helper}>
          <img src={iconInfo} alt="" />
          좋아하는 동물이 있으면 그 동물이 주인공이 돼요
        </p>
      </div>
    </div>
  );
}

export default ChildInfoStep;
