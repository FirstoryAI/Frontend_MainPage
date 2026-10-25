import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { useSignupDraft } from '../../features/auth/SignupDraftContext';
import { sendPhoneVerificationCode, verifyPhoneCode } from '../../services/authApi';
import styles from './EmailSignUpPage.module.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

// 이메일로 시작하기: 1) 이메일·비밀번호 → 2) 휴대폰 번호·인증번호 → 보호자 동의
function EmailSignUpPage() {
  const navigate = useNavigate();
  const { signupDraft, setSignupDraft, signupFeedback, setSignupFeedback } = useSignupDraft();

  // 보호자 동의 화면에서 가입 정보 문제로 돌아왔을 때: 휴대폰 인증이 풀렸으면 2단계, 아니면 1단계부터 다시 봐요.
  const [step, setStep] = useState(() =>
    signupDraft && signupDraft.phoneVerified === false ? 'phone' : 'account',
  );
  const [email, setEmail] = useState(signupDraft?.email ?? '');
  const [password, setPassword] = useState(signupDraft?.password ?? '');
  const [accountError, setAccountError] = useState('');

  const [phone, setPhone] = useState(signupDraft?.phone ?? '');
  const [code, setCode] = useState('');
  const [codePhone, setCodePhone] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState(
    signupDraft?.phoneVerified ? signupDraft.phone : '',
  );
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendWait, setResendWait] = useState(0);
  const [requiresNewCode, setRequiresNewCode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState(
    signupDraft?.phoneVerified ? '휴대폰 인증이 완료됐어요.' : '',
  );
  const isPhoneVerified = Boolean(phone) && verifiedPhone === phone;
  const codeExpired = Boolean(codePhone) && secondsLeft === 0 && !isPhoneVerified;

  useEffect(() => {
    if (secondsLeft === 0 && resendWait === 0) return undefined;

    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
      setResendWait((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsLeft, resendWait]);

  const handleAccountSubmit = (event) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAccountError('이메일을 입력해 주세요.');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setAccountError('이메일 주소를 다시 확인해 주세요.');
      return;
    }
    if (!password) {
      setAccountError('비밀번호를 입력해 주세요.');
      return;
    }
    if (!PASSWORD_PATTERN.test(password)) {
      setAccountError('영문과 숫자를 포함해 8~64자로 입력해 주세요.');
      return;
    }

    setEmail(trimmedEmail);
    setAccountError('');
    setSignupFeedback(null);
    setStep('phone');
  };

  const handlePhoneChange = (event) => {
    const nextPhone = formatPhone(event.target.value);
    setPhone(nextPhone);
    setPhoneMessage('');
    setSignupFeedback(null);

    if (nextPhone !== verifiedPhone) setVerifiedPhone('');
    if (nextPhone !== codePhone) {
      setCode('');
      setCodePhone('');
      setSecondsLeft(0);
      setResendWait(0);
      setRequiresNewCode(false);
    }
  };

  const handleSendCode = async () => {
    if (!/^010-\d{4}-\d{4}$/.test(phone)) {
      setPhoneMessage('010-0000-0000 형식의 휴대폰 번호를 입력해 주세요.');
      return;
    }

    setIsSending(true);
    setPhoneMessage('');
    setSignupFeedback(null);

    try {
      const response = await sendPhoneVerificationCode(phone, 'SIGNUP');
      setCodePhone(phone);
      setCode('');
      setVerifiedPhone('');
      setSecondsLeft(response?.expiresInSeconds ?? 180);
      setResendWait(60);
      setRequiresNewCode(false);
    } catch (requestError) {
      if (requestError.code === 'SMS_RESEND_TOO_SOON') {
        setResendWait(60);
      } else if (requestError.code === 'SMS_RATE_LIMITED') {
        setResendWait(60 * 60);
      }
      setPhoneMessage(requestError.message || '인증번호를 보내지 못했어요.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (codePhone !== phone) {
      setPhoneMessage('먼저 현재 휴대폰 번호로 인증번호를 요청해 주세요.');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setPhoneMessage('인증번호 6자리를 입력해 주세요.');
      return;
    }

    setIsVerifying(true);
    setPhoneMessage('');

    try {
      await verifyPhoneCode(phone, code);
      setVerifiedPhone(phone);
      setPhoneMessage('휴대폰 인증이 완료됐어요.');
      setSignupFeedback(null);
    } catch (requestError) {
      if (
        requestError.code === 'VERIFICATION_ATTEMPTS_EXCEEDED' ||
        requestError.code === 'VERIFICATION_EXPIRED'
      ) {
        setRequiresNewCode(true);
      }
      setPhoneMessage(requestError.message || '인증번호를 확인하지 못했어요.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePhoneSubmit = (event) => {
    event.preventDefault();

    if (!isPhoneVerified) {
      setPhoneMessage('가입을 계속하려면 휴대폰 인증을 완료해 주세요.');
      return;
    }

    setSignupFeedback(null);
    setSignupDraft({ email, password, phone: verifiedPhone, phoneVerified: true });
    navigate('/auth/consent');
  };

  const sendLabel = isSending
    ? '전송 중'
    : resendWait > 0
      ? resendWait >= 60
        ? `${Math.ceil(resendWait / 60)}분 후 재전송`
        : `${resendWait}초 후 재전송`
      : codePhone
        ? '재전송'
        : '인증번호 받기';

  const codeHelp = requiresNewCode
    ? '인증번호를 다시 요청해 주세요.'
    : secondsLeft > 0
      ? `인증번호가 ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')} 동안 유효해요.`
      : codePhone
        ? '인증번호가 만료됐어요. 다시 요청해 주세요.'
        : '인증번호는 발송 후 3분 동안 유효해요.';

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="email-signup-title">
          {step === 'account' ? (
            <Link className={styles.backLink} to="/">
              ← 다른 방법으로 시작
            </Link>
          ) : (
            <button className={styles.backLink} type="button" onClick={() => setStep('account')}>
              ← 이전
            </button>
          )}

          <p className={styles.stepLabel}>{step === 'account' ? '1 / 2' : '2 / 2'}</p>
          <h1 id="email-signup-title" className={styles.title}>
            {step === 'account' ? '이메일로 시작하기' : '휴대폰 인증'}
          </h1>

          {step === 'account' ? (
            <form className={styles.form} noValidate onSubmit={handleAccountSubmit}>
              <label className={styles.label} htmlFor="email">
                이메일
              </label>
              <input
                className={styles.input}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setAccountError('');
                }}
              />

              <label className={styles.label} htmlFor="password">
                비밀번호
              </label>
              <input
                className={styles.input}
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호"
                maxLength={64}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setAccountError('');
                }}
              />
              <p className={styles.hint}>영문과 숫자를 포함해 8~64자로 입력해 주세요.</p>

              {(accountError || signupFeedback) && (
                <p className={styles.error} role="alert">
                  {accountError || signupFeedback.message}
                </p>
              )}

              <button className={styles.submitButton} type="submit">
                다음
              </button>
            </form>
          ) : (
            <form className={styles.form} noValidate onSubmit={handlePhoneSubmit}>
              <label className={styles.label} htmlFor="phone">
                휴대폰 번호
              </label>
              <div className={styles.inlineRow}>
                <input
                  className={styles.input}
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={handlePhoneChange}
                  aria-describedby="phone-help phone-status"
                />
                <button
                  className={styles.inlineButton}
                  type="button"
                  onClick={handleSendCode}
                  disabled={isSending || resendWait > 0 || isPhoneVerified}
                >
                  {sendLabel}
                </button>
              </div>

              <label className={styles.label} htmlFor="verification-code">
                인증번호
              </label>
              <div className={styles.inlineRow}>
                <input
                  className={styles.input}
                  id="verification-code"
                  name="verificationCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="인증번호 6자리"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={!codePhone || isPhoneVerified || requiresNewCode || codeExpired}
                  aria-describedby="phone-help phone-status"
                />
                <button
                  className={styles.inlineButton}
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={!codePhone || isVerifying || isPhoneVerified || requiresNewCode || codeExpired}
                >
                  {isVerifying ? '확인 중' : isPhoneVerified ? '인증 완료' : '확인'}
                </button>
              </div>
              <p id="phone-help" className={styles.hint}>
                {codeHelp}
              </p>
              <p
                id="phone-status"
                className={`${styles.status} ${isPhoneVerified ? styles.success : ''}`}
                role="status"
                aria-live="polite"
              >
                {phoneMessage}
              </p>
              {signupFeedback && (
                <p className={styles.error} role="alert">
                  {signupFeedback.message}
                </p>
              )}

              <button className={styles.submitButton} type="submit">
                회원가입
              </button>
            </form>
          )}

          <p className={styles.loginPrompt}>
            이미 가입했나요?{' '}
            <button className={styles.loginLink} type="button" onClick={() => navigate('/auth/email/login')}>
              로그인
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}

export default EmailSignUpPage;
