import MascotBubble from './MascotBubble';
import { calcAge, parseLikes } from '../utils';
import styles from './SummaryStep.module.css';

function EditButton({ label, onClick }) {
  const unavailable = !onClick;

  return (
    <button
      className={styles.editButton}
      type="button"
      aria-label={label}
      disabled={unavailable}
      title={unavailable ? '수정 화면이 준비되면 연결됩니다' : undefined}
      onClick={onClick}
    >
      수정하기
    </button>
  );
}

function Tags({ items }) {
  if (items.length === 0) {
    return <span className={styles.empty}>-</span>;
  }

  return (
    <ul className={styles.tags}>
      {items.map((item) => (
        <li className={styles.tag} key={item}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function SummaryStep({ child, situation, goal, onEditChild, onEditSituation, onEditGoal }) {
  const age = calcAge(child.birthYear, child.birthMonth);
  const traits = [...child.traits, child.customTrait.trim()].filter(Boolean);
  const likes = parseLikes(child.likes);

  return (
    <div className={styles.step}>
      <MascotBubble
        className={styles.intro}
        title="이 내용으로 동화를 만들까요?"
        description="FIRSTORY AI가 이해한 내용이에요. 다르면 고쳐 주세요."
      />

      <div className={styles.cards}>
        <section className={`${styles.card} ${styles.childCard}`} aria-labelledby="summary-child">
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle} id="summary-child">
              아이
            </h2>
            <EditButton label="아이 정보 수정하기" onClick={onEditChild} />
          </div>

          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt>나이</dt>
              <dd className={styles.age}>{age === null ? '-' : `만 ${age}세`}</dd>
            </div>
            <div className={styles.fact}>
              <dt>성향</dt>
              <dd>
                <Tags items={traits} />
              </dd>
            </div>
            <div className={`${styles.fact} ${styles.wideLabel}`}>
              <dt>좋아하는 것</dt>
              <dd>
                <Tags items={likes} />
              </dd>
            </div>
          </dl>
        </section>

        <div className={styles.column}>
          <section className={styles.card} aria-labelledby="summary-situation">
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle} id="summary-situation">
                상황
              </h2>
              <EditButton label="상황 수정하기" onClick={onEditSituation} />
            </div>
            <p className={styles.text}>{situation}</p>
          </section>

          <section className={styles.card} aria-labelledby="summary-goal">
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle} id="summary-goal">
                이번 이야기에서 나누고 싶은 것
              </h2>
              <EditButton label="나누고 싶은 이야기 수정하기" onClick={onEditGoal} />
            </div>
            <p className={styles.text}>{goal}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default SummaryStep;
