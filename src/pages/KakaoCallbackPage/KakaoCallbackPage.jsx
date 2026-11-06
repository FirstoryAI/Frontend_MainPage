import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { kakaoLogin } from '../../services/authApi';
import { useSignupDraft } from '../../features/auth/SignupDraftContext';
import { setSignedInStatus } from '../../features/auth/useSignedIn';
import styles from '../EmailSignUpPage/EmailSignUpPage.module.css';

// React StrictMode can remount this page. Keep the request by code so it is never exchanged twice.
const exchanges = new Map();

function KakaoCallbackPage() {
  const [params] = useSearchParams();
  const code = params.get('code');
  const oauthError = params.get('error');
  const navigate = useNavigate();
  const { setSignupDraft } = useSignupDraft();
  const [error, setError] = useState('');

  useEffect(() => {
    if (oauthError || !code) return;
    if (!exchanges.has(code)) {
      exchanges.set(code, kakaoLogin(code, `${window.location.origin}/oauth/kakao`));
    }
    let active = true;
    exchanges.get(code).then((result) => {
      if (!active) return;
      if (result.status === 'LOGGED_IN') {
        setSignedInStatus(true);
        navigate('/home', { replace: true, state: {
          onboarding: !result.me?.onboardingSeen,
          onboardingKey: result.me?.email,
        } });
      } else if (result.status === 'SIGNUP_REQUIRED') {
        setSignupDraft({ type: 'kakao', email: result.email ?? '', emailVerified: result.emailVerified === true, kakaoEmailVerified: result.emailVerified === true });
        navigate('/auth/kakao/signup', { replace: true });
      } else setError('카카오 로그인 응답을 확인하지 못했어요.');
    }).catch((requestError) => {
      if (!active) return;
      if (requestError.code === 'KAKAO_EMAIL_REGISTERED') setError('이미 이메일로 가입한 계정이에요. 이메일로 로그인해 주세요.');
      else if (requestError.code === 'KAKAO_UNAVAILABLE') setError('카카오 로그인을 잠시 이용할 수 없어요. 나중에 다시 시도해 주세요.');
      else setError('카카오 로그인을 완료하지 못했어요. 다시 시도해 주세요.');
    });
    return () => { active = false; };
  }, [code, oauthError, navigate, setSignupDraft]);

  return <div className={styles.page}><Header /><main className={styles.main}>
    <section className={styles.card} aria-labelledby="kakao-callback-title">
      <h1 id="kakao-callback-title" className={styles.title}>카카오 로그인</h1>
      {error || oauthError || !code ? <>
        <p className={styles.error} role="alert">{error || '카카오 로그인을 완료하지 못했어요. 다시 시도해 주세요.'}</p>
        <Link to="/auth">다시 시작하기</Link>{' · '}<Link to="/auth/email/login">이메일로 로그인</Link>
      </> : <p role="status">로그인 처리 중…</p>}
    </section>
  </main></div>;
}

export default KakaoCallbackPage;
