import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import kakaoSymbol from '../../../assets/icons/kakao-symbol.png';
import styles from './AuthCard.module.css';

const kakaoRedirectUri = () =>
  `${window.location.origin}/oauth/kakao`;

function AuthCard() {
  const location = useLocation();
  const [error, setError] = useState('');
  const startKakao = () => {
    const key = import.meta.env.VITE_KAKAO_REST_API_KEY;
    if (!key) {
      setError('카카오 로그인 설정이 필요해요.');
      return;
    }
    const params = new URLSearchParams({
      client_id: key,
      redirect_uri: kakaoRedirectUri(),
      response_type: 'code',
    });
    window.location.assign(`https://kauth.kakao.com/oauth/authorize?${params}`);
  };
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
          onClick={startKakao}
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
      {(error || location.state?.notice) && <p className={styles.error} role="alert">{error || location.state.notice}</p>}

      <Link
        className={styles.loginButton}
        to="/auth/email/login"
        state={location.state}
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
