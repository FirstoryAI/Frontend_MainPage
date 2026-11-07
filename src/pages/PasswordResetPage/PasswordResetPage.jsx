import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import EmailVerification from '../../features/auth/components/EmailVerification';
import { resetPassword } from '../../services/authApi';
import { EMAIL_PATTERN, PASSWORD_PATTERN } from '../EmailSignUpPage/EmailSignUpPage';
import styles from '../EmailSignUpPage/EmailSignUpPage.module.css';

function PasswordResetPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim()) || verifiedEmail !== email.trim()) return setError('이메일 인증을 완료해 주세요.');
    if (!PASSWORD_PATTERN.test(password)) return setError('비밀번호는 8~20자이며 영문·숫자·특수기호를 포함해야 해요.');
    setBusy(true); setError('');
    try {
      await resetPassword(email.trim(), password);
      navigate('/auth/email/login', { replace: true, state: { notice: '비밀번호를 새로 설정했어요. 로그인해 주세요.' } });
    } catch (requestError) { setError(requestError.message || '비밀번호를 설정하지 못했어요.'); }
    finally { setBusy(false); }
  };

  return <div className={styles.page}><Header /><main className={styles.main}>
    <section className={styles.card} aria-labelledby="reset-title">
      <Link className={styles.backLink} to="/auth/email/login">← 로그인으로</Link>
      <h1 id="reset-title" className={styles.title}>비밀번호 찾기</h1>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label} htmlFor="reset-email">이메일</label>
        <EmailVerification inputId="reset-email" email={email} purpose="PASSWORD_RESET"
          onEmailChange={(value) => { setEmail(value); setVerifiedEmail(''); }}
          verified={Boolean(verifiedEmail) && verifiedEmail === email.trim()} onVerified={setVerifiedEmail} />
        <label className={`${styles.label} ${styles.passwordLabel}`} htmlFor="new-password">새 비밀번호</label>
        <input className={styles.input} id="new-password" type="password" autoComplete="new-password"
          value={password} onChange={(event) => setPassword(event.target.value)} maxLength={20} />
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.submitButton} type="submit" disabled={busy}>{busy ? '설정 중…' : '비밀번호 설정'}</button>
      </form>
    </section>
  </main></div>;
}

export default PasswordResetPage;
