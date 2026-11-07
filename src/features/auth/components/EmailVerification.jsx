import { useEffect, useState } from 'react';
import { sendEmailVerificationCode, verifyEmailCode } from '../../../services/authApi';
import iconVerified from '../../../assets/icons/icon-email-verified.svg';
import styles from '../../../pages/EmailSignUpPage/EmailSignUpPage.module.css';

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_CODE_SECONDS = 300;
const RESEND_WAIT_SECONDS = 60;
const RATE_LIMIT_WAIT_SECONDS = 3600;

const secondsUntil = (deadline, now) => Math.max(0, Math.ceil((deadline - now) / 1000));
const formatTimer = (seconds) => `${Math.floor(seconds / 60)} : ${String(seconds % 60).padStart(2, '0')}`;

// 이메일 입력 칸과 인증번호 받기·확인을 묶은 부분이에요.
// 이메일을 바꾸면 처음 상태로 돌아가고, 인증번호를 보내면 아래에 입력 칸과 남은 시간이 나와요.
export default function EmailVerification({ inputId, email, onEmailChange, purpose, verified, onVerified }) {
  const trimmedEmail = email.trim();
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  // 남은 시간은 시각으로 계산해요. 화면이 잠시 멈췄다 돌아와도 실제 남은 시간과 어긋나지 않아요.
  const [codeDeadline, setCodeDeadline] = useState(0);
  const [resendDeadline, setResendDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const codeSent = Boolean(sentTo) && sentTo === trimmedEmail;
  const secondsLeft = secondsUntil(codeDeadline, now);
  const resendSeconds = secondsUntil(resendDeadline, now);
  const expired = codeSent && !verified && secondsLeft === 0;

  useEffect(() => {
    if (!codeDeadline && !resendDeadline) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [codeDeadline, resendDeadline]);

  const changeEmail = (event) => {
    onEmailChange(event.target.value);
    setSentTo('');
    setCode('');
    setCodeDeadline(0);
    setResendDeadline(0);
    setMessage('');
  };

  const send = async () => {
    if (!EMAIL_FORMAT.test(trimmedEmail)) {
      setMessage('올바른 이메일 형식이 아니에요.');
      return;
    }
    if (resendSeconds > 0) {
      setMessage(`${resendSeconds}초 뒤에 다시 보낼 수 있어요.`);
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const result = await sendEmailVerificationCode(trimmedEmail, purpose);
      const sentAt = Date.now();
      setSentTo(trimmedEmail);
      setCode('');
      setNow(sentAt);
      setCodeDeadline(sentAt + (result?.expiresInSeconds ?? DEFAULT_CODE_SECONDS) * 1000);
      setResendDeadline(sentAt + RESEND_WAIT_SECONDS * 1000);
      setMessage(purpose === 'PASSWORD_RESET'
        ? '가입된 이메일이면 인증번호가 발송돼요. 스팸함도 확인해 주세요.'
        : '인증번호를 보냈어요. 스팸함도 확인해 주세요.');
    } catch (error) {
      const failedAt = Date.now();
      setNow(failedAt);
      if (error.code === 'VERIFICATION_RESEND_TOO_SOON') setResendDeadline(failedAt + RESEND_WAIT_SECONDS * 1000);
      if (error.code === 'VERIFICATION_RATE_LIMITED') setResendDeadline(failedAt + RATE_LIMIT_WAIT_SECONDS * 1000);
      setMessage(error.message || '인증번호를 보내지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setMessage('인증번호 6자리를 확인해 주세요.');
      return;
    }

    setBusy(true);
    try {
      await verifyEmailCode(trimmedEmail, code);
      setMessage('');
      onVerified(trimmedEmail);
    } catch (error) {
      setMessage(error.message || '인증번호를 확인하지 못했어요.');
      if (['VERIFICATION_ATTEMPTS_EXCEEDED', 'VERIFICATION_EXPIRED'].includes(error.code)) setCodeDeadline(1);
    } finally {
      setBusy(false);
    }
  };

  const status = verified ? '인증이 완료되었습니다.' : expired ? '인증번호가 만료됐어요. 다시 요청해 주세요.' : message;

  return (
    <>
      <div className={styles.emailField}>
        <input
          className={`${styles.input} ${styles.emailInput}`}
          id={inputId}
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={changeEmail}
        />
        <button
          className={codeSent ? styles.codeResend : styles.codeRequest}
          type="button"
          onClick={send}
          disabled={!trimmedEmail || busy || verified}
        >
          {codeSent ? '인증번호 재전송' : '인증번호 받기'}
        </button>
      </div>

      {codeSent && (
        <div className={styles.codeRow}>
          <div className={styles.codeField}>
            <input
              className={styles.codeInput}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="이메일 인증번호"
              maxLength={6}
              placeholder="인증번호 6자리"
              value={code}
              readOnly={verified}
              disabled={expired}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            {!verified && (
              <span
                className={styles.codeTimer}
                role="timer"
                aria-label={`남은 시간 ${Math.floor(secondsLeft / 60)}분 ${secondsLeft % 60}초`}
              >
                {formatTimer(secondsLeft)}
              </span>
            )}
          </div>
          {verified
            ? <img className={styles.codeVerified} src={iconVerified} alt="" />
            : <button className={styles.codeConfirm} type="button" onClick={verify} disabled={expired || busy}>확인</button>}
        </div>
      )}

      {status && (
        <p className={`${styles.fieldStatus} ${verified ? styles.fieldStatusDone : ''}`} role="status" aria-live="polite">
          {status}
        </p>
      )}
    </>
  );
}
