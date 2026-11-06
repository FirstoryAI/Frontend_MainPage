import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { useSignupDraft } from '../../features/auth/SignupDraftContext';
import EmailVerification from '../../features/auth/components/EmailVerification';
import { EMAIL_PATTERN } from '../EmailSignUpPage/EmailSignUpPage';
import styles from '../EmailSignUpPage/EmailSignUpPage.module.css';

function KakaoSignUpPage() {
  const navigate = useNavigate();
  const { signupDraft, setSignupDraft, signupFeedback } = useSignupDraft();
  const [email, setEmail] = useState(signupDraft?.email ?? '');
  const [verifiedEmail, setVerifiedEmail] = useState(signupDraft?.emailVerified ? signupDraft.email : '');
  const [error, setError] = useState('');

  if (signupDraft?.type !== 'kakao') return <Navigate to="/auth" replace />;
  const verified = Boolean(verifiedEmail) && verifiedEmail === email.trim();
  const submit = (event) => {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim()) || !verified) return setError('이메일 인증을 완료해 주세요.');
    setSignupDraft({ ...signupDraft, email: email.trim(), emailVerified: true });
    navigate('/auth/consent');
  };

  return <div className={styles.page}><Header /><main className={styles.main}>
    <section className={styles.card} aria-labelledby="kakao-signup-title">
      <h1 id="kakao-signup-title" className={styles.title}>카카오로 시작하기</h1>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label} htmlFor="kakao-email">이메일</label>
        <input className={styles.input} id="kakao-email" type="email" value={email}
          readOnly={signupDraft.emailVerified} onChange={(event) => {
            setEmail(event.target.value); setVerifiedEmail(''); setError('');
          }} placeholder="name@example.com" />
        {!signupDraft.emailVerified && <EmailVerification key={email.trim()} email={email.trim()}
          purpose="SIGNUP" verified={verified} onVerified={() => setVerifiedEmail(email.trim())} />}
        {signupDraft.emailVerified && <p className={styles.hint}>카카오에서 이메일을 확인했어요.</p>}
        {(error || signupFeedback) && <p className={styles.error} role="alert">{error || signupFeedback.message}</p>}
        <button className={styles.submitButton} type="submit">약관 동의로 계속</button>
      </form>
    </section>
  </main></div>;
}

export default KakaoSignUpPage;
