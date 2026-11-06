import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { useSignupDraft } from '../../features/auth/SignupDraftContext';
import EmailVerification from '../../features/auth/components/EmailVerification';
import styles from './EmailSignUpPage.module.css';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+=[\]:;,.?/\\-])[A-Za-z\d!@#$%^&*()_+=[\]:;,.?/\\-]{8,20}$/;

function EmailSignUpPage() {
  const navigate = useNavigate();
  const { signupDraft, setSignupDraft, signupFeedback, setSignupFeedback } = useSignupDraft();
  const [email, setEmail] = useState(signupDraft?.type === 'email' ? signupDraft.email : '');
  const [password, setPassword] = useState(signupDraft?.type === 'email' ? signupDraft.password : '');
  const [verifiedEmail, setVerifiedEmail] = useState(signupDraft?.emailVerified ? signupDraft.email : '');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!EMAIL_PATTERN.test(normalizedEmail)) return setError('이메일 주소를 다시 확인해 주세요.');
    if (!PASSWORD_PATTERN.test(password)) return setError('비밀번호는 8~20자이며 영문·숫자·특수기호를 포함해야 해요.');
    if (verifiedEmail !== normalizedEmail) return setError('가입할 이메일의 인증을 완료해 주세요.');
    setSignupDraft({ type: 'email', email: normalizedEmail, password, emailVerified: true });
    setSignupFeedback(null);
    navigate('/auth/consent');
  };

  return <div className={styles.page}>
    <Header />
    <main className={styles.main}><section className={styles.card} aria-labelledby="email-signup-title">
      <Link className={styles.backLink} to="/auth">← 다른 방법으로 시작</Link>
      <h1 id="email-signup-title" className={styles.title}>이메일로 시작하기</h1>
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="email">이메일</label>
        <input className={styles.input} id="email" type="email" autoComplete="email" value={email}
          onChange={(event) => { setEmail(event.target.value); setVerifiedEmail(''); setError(''); }} placeholder="name@example.com" />
        <EmailVerification key={email.trim()} email={email.trim()} verified={verifiedEmail === email.trim() && Boolean(verifiedEmail)}
          onVerified={() => setVerifiedEmail(email.trim())} purpose="SIGNUP" />
        <label className={styles.label} htmlFor="password">비밀번호</label>
        <input className={styles.input} id="password" type="password" autoComplete="new-password"
          value={password} maxLength={20} onChange={(event) => setPassword(event.target.value)}
          placeholder="8~20자 / 영문·숫자·특수기호 포함" />
        {(error || signupFeedback) && <p className={styles.error} role="alert">{error || signupFeedback.message}</p>}
        <button className={styles.submitButton} type="submit">회원가입</button>
      </form>
      <p className={styles.loginPrompt}>이미 가입했나요?{' '}
        <Link className={styles.loginLink} to="/auth/email/login">로그인</Link>
      </p>
    </section></main>
  </div>;
}

export default EmailSignUpPage;
