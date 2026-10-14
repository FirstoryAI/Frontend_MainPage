import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import styles from './EmailSignUpPage.module.css';

function EmailSignUpPage() {
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate('/auth/consent');
  };

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="email-signup-title">
          <Link className={styles.backLink} to="/">
            ← 다른 방법으로 시작
          </Link>

          <h1 id="email-signup-title" className={styles.title}>
            이메일로 시작하기
          </h1>

          <form onSubmit={handleSubmit}>
            <label className={`${styles.label} ${styles.emailLabel}`} htmlFor="email">
              이메일
            </label>
            <input
              className={`${styles.input} ${styles.emailInput}`}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              required
            />

            <label
              className={`${styles.label} ${styles.passwordLabel}`}
              htmlFor="password"
            >
              비밀번호
            </label>
            <input
              className={`${styles.input} ${styles.passwordInput}`}
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="비밀번호"
              required
            />

            <button className={styles.submitButton} type="submit">
              회원가입
            </button>
          </form>

          <p className={styles.loginPrompt}>
            이미 가입했나요?{' '}
            <button
              className={styles.loginLink}
              type="button"
              disabled
              title="이메일 로그인 화면이 준비되면 연결됩니다"
            >
              로그인
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}

export default EmailSignUpPage;
