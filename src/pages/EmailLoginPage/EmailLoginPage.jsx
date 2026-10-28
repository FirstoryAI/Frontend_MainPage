import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { login } from '../../services/authApi';
import styles from './EmailLoginPage.module.css';

function EmailLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // '로그인이 필요해요'를 눌러 왔다면 그 화면으로 돌아가요. 사이트 안의 경로만 받아요.
  const from = location.state?.from;
  const returnTo = typeof from === 'string' && /^\/(?!\/|auth\/)/.test(from) && from !== '/' ? from : null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);
    setError('');

    try {
      const account = await login({
        email: formData.get('email'),
        password: formData.get('password'),
        rememberMe: formData.get('rememberMe') === 'on',
      });

      navigate(returnTo ?? '/home', {
        replace: true,
        state: {
          onboarding: !account?.onboardingSeen,
          onboardingKey: formData.get('email'),
        },
      });
    } catch (requestError) {
      setError(requestError.message || '로그인하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="login-title">
          <Link className={styles.backLink} to="/">
            ← 다른 방법으로 시작
          </Link>

          <h1 id="login-title" className={styles.title}>
            이메일로 로그인
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

            <label className={`${styles.label} ${styles.passwordLabel}`} htmlFor="password">
              비밀번호
            </label>
            <input
              className={`${styles.input} ${styles.passwordInput}`}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호"
              required
            />

            <label className={styles.rememberRow}>
              <input type="checkbox" name="rememberMe" />
              <span>로그인 상태 유지 (90일)</span>
            </label>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? '로그인 중…' : '로그인'}
            </button>
          </form>

          <p className={styles.signupPrompt}>
            아직 가입하지 않았나요? <Link to="/auth/email/signup">이메일 회원가입</Link>
          </p>
        </section>
      </main>
    </div>
  );
}

export default EmailLoginPage;
