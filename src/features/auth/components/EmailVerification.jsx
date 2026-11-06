import { useEffect, useState } from 'react';
import { sendEmailVerificationCode, verifyEmailCode } from '../../../services/authApi';
import styles from '../../../pages/EmailSignUpPage/EmailSignUpPage.module.css';

export default function EmailVerification({ email, purpose, verified, onVerified }) {
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendWait, setResendWait] = useState(0);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!secondsLeft && !resendWait) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
      setResendWait((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft, resendWait]);

  const send = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setIsError(true); return setMessage('이메일 주소를 확인해 주세요.'); }
    setBusy(true); setMessage(''); setIsError(false);
    try {
      const result = await sendEmailVerificationCode(email, purpose);
      setSentTo(email); setCode(''); setSecondsLeft(result?.expiresInSeconds ?? 300); setResendWait(60);
      setMessage(purpose === 'PASSWORD_RESET' ? '가입된 이메일이면 인증번호가 발송돼요. 스팸함도 확인해 주세요.' : '인증번호를 보냈어요. 스팸함도 확인해 주세요.');
    } catch (error) {
      setIsError(true);
      if (error.code === 'VERIFICATION_RESEND_TOO_SOON') setResendWait(60);
      if (error.code === 'VERIFICATION_RATE_LIMITED') setResendWait(3600);
      setMessage(error.message || '인증번호를 보내지 못했어요.');
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (sentTo !== email || !/^\d{6}$/.test(code)) { setIsError(true); return setMessage('인증번호 6자리를 확인해 주세요.'); }
    setBusy(true); setIsError(false);
    try { await verifyEmailCode(email, code); onVerified(); setMessage('이메일 인증이 완료됐어요.'); }
    catch (error) {
      setIsError(true);
      setMessage(error.message || '인증번호를 확인하지 못했어요.');
      if (['VERIFICATION_ATTEMPTS_EXCEEDED', 'VERIFICATION_EXPIRED'].includes(error.code)) setSecondsLeft(0);
    } finally { setBusy(false); }
  };

  return <div className={styles.verification}>
    <div className={styles.inlineRow}>
      <span className={styles.hint}>이메일 인증</span>
      <button className={styles.inlineButton} type="button" onClick={send} disabled={busy || resendWait > 0 || verified}>
        {resendWait > 0 ? `${resendWait}초 후 재전송` : sentTo ? '재전송' : '인증번호 받기'}
      </button>
    </div>
    {Boolean(sentTo) && sentTo === email && !verified && <div className={styles.inlineRow}>
      <input className={styles.input} type="text" inputMode="numeric" autoComplete="one-time-code"
        aria-label="이메일 인증번호" maxLength={6} placeholder="인증번호 6자리" value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={!secondsLeft || busy} />
      <button className={styles.inlineButton} type="button" onClick={verify} disabled={!secondsLeft || busy}>확인</button>
    </div>}
    <p className={`${styles.status} ${verified ? styles.success : isError ? styles.verificationError : ''}`} role="status" aria-live="polite">
      {verified ? '이메일 인증이 완료됐어요.' : sentTo && sentTo === email && !secondsLeft ? '인증번호가 만료됐어요. 다시 요청해 주세요.' : message || (secondsLeft ? `인증번호 유효 시간 ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : '인증번호는 5분 동안 유효해요.')}
    </p>
  </div>;
}
