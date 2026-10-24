import { Link } from 'react-router-dom';
import kakaoSymbol from '../../../assets/icons/kakao-symbol.png';
import styles from './AuthCard.module.css';

function AuthCard() {
  return (
    <section className={styles.card} aria-labelledby="auth-card-title">
      <h1 id="auth-card-title" className={styles.logo}>
        FIRSTORY
      </h1>

      <p className={styles.description}>
        아이에게 말하기 어려운 순간,
        <br />
        맞춤 동화로 시작하세요
      </p>

      <div className={styles.actions}>
        <button
          className={`${styles.actionButton} ${styles.kakaoButton}`}
          type="button"
          disabled
          title="카카오 인증 연동 후 활성화됩니다"
        >
          <img src={kakaoSymbol} alt="" width="25" height="22" />
          <span>카카오로 시작하기</span>
        </button>

        <Link
          className={`${styles.actionButton} ${styles.emailButton}`}
          to="/auth/email/signup"
        >
          이메일로 시작하기
        </Link>
      </div>

      <Link
        className={styles.loginButton}
        to="/auth/email/login"
      >
        이메일로 로그인
      </Link>

      <p className={styles.agreement}>
        시작하면 이용약관과 개인정보 처리방침에 동의하게 돼요
      </p>
    </section>
  );
}

export default AuthCard;
