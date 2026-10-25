import { useNavigate } from 'react-router-dom';
import bookCover from '../../../assets/images/story-complete-cover.webp';
import styles from './CompleteStep.module.css';

// '○○을 위한 동화'의 ○○ 자리에는 아이 이름이 들어갈 수 있지만, 서비스는 아이 이름을 받지 않아서 '우리 아이'로 보여줘요.
const CHILD_LABEL = '우리 아이';

function CompleteStep({ title }) {
  const navigate = useNavigate();

  return (
    <div className={styles.step}>
      <figure className={styles.book}>
        <div className={styles.cover}>
          <div className={styles.crop}>
            <img className={styles.image} src={bookCover} alt={`${title} 동화책 표지`} />
          </div>
        </div>
        <figcaption className={styles.bookTitle}>{title}</figcaption>
      </figure>

      <h1 className={styles.title} role="status">
        제작이 완료되었어요
      </h1>
      <p className={styles.description}>
        {CHILD_LABEL}를 위한 동화가 완성되었어요. 서재에서 확인하실 수 있어요.
      </p>

      <button className={styles.cta} type="button" onClick={() => navigate('/library')}>
        서재에서 동화 바로 확인하기 →
      </button>
    </div>
  );
}

export default CompleteStep;
