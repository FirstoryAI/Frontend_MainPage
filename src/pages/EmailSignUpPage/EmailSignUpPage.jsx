import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { useSignupDraft } from '../../features/auth/SignupDraftContext';
import { sendPhoneVerificationCode, verifyPhoneCode } from '../../services/authApi';
import styles from './EmailSignUpPage.module.css';

function EmailSignUpPage() {
  const navigate = useNavigate();
  const { signupDraft, setSignupDraft, signupFeedback, setSignupFeedback } = useSignupDraft();
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
  const [error, setError] = useState(
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

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (event) => {
    const nextPhone = formatPhone(event.target.value);
    setPhone(nextPhone);
    setError('');
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
      setError('010-0000-0000 형식의 휴대폰 번호를 입력해 주세요.');
      return;
    }

    setIsSending(true);
    setError('');
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
      setError(requestError.message || '인증번호를 보내지 못했어요.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (codePhone !== phone) {
      setError('먼저 현재 휴대폰 번호로 인증번호를 요청해 주세요.');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError('인증번호 6자리를 입력해 주세요.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await verifyPhoneCode(phone, code);
      setVerifiedPhone(phone);
      setError('휴대폰 인증이 완료됐어요.');
      setSignupFeedback(null);
    } catch (requestError) {
      if (
        requestError.code === 'VERIFICATION_ATTEMPTS_EXCEEDED' ||
        requestError.code === 'VERIFICATION_EXPIRED'
      ) {
        setRequiresNewCode(true);
      }
      setError(requestError.message || '인증번호를 확인하지 못했어요.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const loginButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent.trim() === '로그인');
    if (!loginButton) return undefined;
    loginButton.type = 'button';
    loginButton.disabled = false;
    const goToLogin = () => navigate('/auth/email/login');
    loginButton.addEventListener('click', goToLogin);
    return () => loginButton.removeEventListener('click', goToLogin);
  }, [navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!isPhoneVerified) {
      setError('가입을 계속하려면 휴대폰 인증을 완료해 주세요.');
      return;
    }

    setSignupFeedback(null);
    const formData = new FormData(event.currentTarget);
    setSignupDraft({
      email: formData.get('email'),
      password: formData.get('password'),
      phone: verifiedPhone,
      phoneVerified: true,
    });
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

      <form noValidate onFocusCapture={(event) => {
        const input = event.target;
        if (isPhoneVerified) event.currentTarget.querySelector('[data-signup-validation]')?.remove();
        if (!isPhoneVerified && input instanceof HTMLInputElement && ['email', 'password'].includes(input.name)) {
          input.blur();
          const form = event.currentTarget;
          form.querySelector('[data-signup-validation]')?.remove();
          let notice = form.querySelector('[data-signup-validation]');
          if (!notice) {
            notice = document.createElement('p');
            notice.dataset.signupValidation = 'true';
            notice.className = styles.signupValidationMessage;
            notice.setAttribute('role', 'status');
            notice.textContent = '이메일을 입력하기 전에 휴대폰 인증을 먼저 완료해 주세요.';
            const submitButton = form.querySelector('button[type="submit"]')
              || Array.from(form.querySelectorAll('button')).find((button) => button.type !== 'button');
            if (submitButton) {
              notice.style.position = 'absolute';
              notice.style.left = `${submitButton.offsetLeft}px`;
              notice.style.width = `${submitButton.offsetWidth}px`;
              submitButton.insertAdjacentElement('beforebegin', notice);
              notice.style.top = `${Math.max(0, submitButton.offsetTop - notice.offsetHeight - 12)}px`;
            } else form.appendChild(notice);
          }
        }
      }} onBeforeInput={(event) => {
        const input = event.target;
        if (!isPhoneVerified && input instanceof HTMLInputElement && ['email', 'password'].includes(input.name)) {
          event.preventDefault();
        }
      }} onInput={(event) => {
        const input = event.target;
        if (input instanceof HTMLInputElement) {
          event.currentTarget.querySelector('[data-signup-validation]')?.remove();
        }
      }} onSubmit={(event) => {
        const form = event.currentTarget;
        form.querySelector('[data-signup-validation]')?.remove();
        const emailInput = form.elements.email;
        const passwordInput = form.elements.password;
        const email = String(emailInput?.value || '').trim();
        const password = String(passwordInput?.value || '');
        const validationMessages = [];
        const emailIsInvalid = !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!isPhoneVerified) {
          validationMessages.push('이메일을 입력하기 전에 휴대폰 인증을 먼저 완료해 주세요.');
        } else if (emailIsInvalid) {
          validationMessages.push(email ? '이메일 주소를 다시 확인해 주세요.' : '이메일을 입력해 주세요.');
        } else if (!password || !/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(password)) {
          validationMessages.push(password ? '영문과 숫자를 포함해 8~64자로 입력해 주세요.' : '비밀번호를 입력해 주세요.');
        }
        if (validationMessages.length) {
          event.preventDefault();
          // 포커스를 안내보다 먼저 옮긴다. 포커스가 옮겨질 때 안내를 지우는 onFocusCapture가
          // 방금 만든 안내를 곧바로 지우지 않도록 순서를 지켜야 한다.
          (emailIsInvalid ? emailInput : passwordInput).focus();
          form.querySelector('[data-signup-validation]')?.remove();
          const notice = document.createElement('div');
          notice.dataset.signupValidation = 'true';
          notice.className = styles.signupValidationMessage;
          notice.setAttribute('role', 'alert');
          validationMessages.forEach((text) => {
            const item = document.createElement('p');
            item.textContent = text;
            notice.appendChild(item);
          });
          const submitButton = form.querySelector('button[type="submit"]')
            || Array.from(form.querySelectorAll('button')).find((button) => button.type !== 'button');
          if (submitButton) {
            notice.style.position = 'absolute';
            notice.style.left = `${submitButton.offsetLeft}px`;
            notice.style.width = `${submitButton.offsetWidth}px`;
            submitButton.insertAdjacentElement('beforebegin', notice);
            notice.style.top = `${Math.max(0, submitButton.offsetTop - notice.offsetHeight - 12)}px`;
          } else form.appendChild(notice);
          return;
        }
        handleSubmit(event);
      }}>
            <label className={`${styles.label} ${styles.phoneLabel}`} htmlFor="phone">
              휴대폰 번호
            </label>
            <input
              className={`${styles.input} ${styles.phoneInput}`}
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="010-0000-0000"
              value={phone}
              onChange={handlePhoneChange}
              aria-describedby="phone-help phone-status"
              required
            />
            <button
              className={`${styles.inlineButton} ${styles.sendCodeButton}`}
              type="button"
              onClick={handleSendCode}
              disabled={isSending || resendWait > 0 || isPhoneVerified}
            >
              {isSending
                ? '전송 중'
                : resendWait > 0
                  ? resendWait >= 60
                    ? `${Math.ceil(resendWait / 60)}분 후 재전송`
                    : `${resendWait}초 후 재전송`
                  : codePhone
                    ? '재전송'
                    : '인증번호 받기'}
            </button>

            <label className={`${styles.label} ${styles.codeLabel}`} htmlFor="verification-code">
              인증번호
            </label>
            <input
              className={`${styles.input} ${styles.codeInput}`}
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
              className={`${styles.inlineButton} ${styles.verifyButton}`}
              type="button"
              onClick={handleVerifyCode}
              disabled={!codePhone || isVerifying || isPhoneVerified || requiresNewCode || codeExpired}
            >
              {isVerifying ? '확인 중' : isPhoneVerified ? '인증 완료' : '확인'}
            </button>
            <p id="phone-help" className={styles.phoneHelp}>
              {requiresNewCode
                ? '인증번호를 다시 요청해 주세요.'
                : secondsLeft > 0
                  ? `인증번호가 ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')} 동안 유효해요.`
                  : codePhone
                    ? '인증번호가 만료됐어요. 다시 요청해 주세요.'
                    : '인증번호는 발송 후 3분 동안 유효해요.'}
            </p>
            <p
              id="phone-status"
              className={`${styles.phoneStatus} ${isPhoneVerified ? styles.success : ''}`}
              role="status"
              aria-live="polite"
            >
              {error}
            </p>
            {signupFeedback && (
              <p className={styles.signupFeedback} role="alert">
                {signupFeedback.message}
              </p>
            )}

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
              defaultValue={signupDraft?.email ?? ''}
              onChange={() => setSignupFeedback(null)}
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
              defaultValue={signupDraft?.password ?? ''}
              minLength={8}
              maxLength={64}
              onChange={() => setSignupFeedback(null)}
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
