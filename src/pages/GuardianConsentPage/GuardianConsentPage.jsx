import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import checkboxChecked from '../../assets/icons/checkbox-checked.svg';
import checkboxUnchecked from '../../assets/icons/checkbox-unchecked.svg';
import { useSignupDraft } from '../../features/auth/SignupDraftContext';
import styles from './GuardianConsentPage.module.css';
import { loadNotificationSettings, saveNotificationSettings } from '../../features/profile/notificationSettings';
import { kakaoSignup, signup } from '../../services/authApi';
import { setSignedInStatus } from '../../features/auth/useSignedIn';

const TERMS_VERSION = '2026-10-01';

const initialAgreements = {
  guardian: false,
  terms: false,
  privacy: false,
  notification: false,
};

const agreementItems = [
  { id: 'guardian', label: '(필수) 아이의 보호자(법정 대리인)예요' },
  { id: 'terms', label: '(필수) 서비스 이용약관' },
  { id: 'privacy', label: '(필수) 아이 정보를 포함한 개인정보 수집·이용' },
  { id: 'notification', label: '(선택) 동화 제작 소식 이메일로 받기' },
];

function CheckboxGraphic({ checked }) {
  return <img src={checked ? checkboxChecked : checkboxUnchecked} alt="" />;
}

function GuardianConsentPage() {
  const [agreements, setAgreements] = useState(initialAgreements);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 가입이 끝나 입력해 둔 가입 정보를 비운 뒤에는, 가입 화면으로 되돌리지 않고 홈으로 이동하는 걸 기다려요.
  const [isCompleted, setIsCompleted] = useState(false);
  const navigate = useNavigate();
  const { signupDraft, setSignupDraft, setSignupFeedback } = useSignupDraft();

  const allAccepted = Object.values(agreements).every(Boolean);
  const requiredAccepted =
    agreements.guardian && agreements.terms && agreements.privacy;

  const toggleAll = () => {
    const nextValue = !allAccepted;
    setAgreements({
      guardian: nextValue,
      terms: nextValue,
      privacy: nextValue,
      notification: nextValue,
    });
  };

  const toggleAgreement = (id) => {
    setAgreements((current) => ({ ...current, [id]: !current[id] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!requiredAccepted || !signupDraft || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const consents = {
        GUARDIAN: agreements.guardian,
        TERMS: agreements.terms,
        PRIVACY: agreements.privacy,
        EMAIL_NOTIFY: agreements.notification,
      };
      const payload = signupDraft.type === 'kakao'
        ? { ...(signupDraft.kakaoEmailVerified ? {} : { email: signupDraft.email }), consents, termsVersion: TERMS_VERSION }
        : { email: signupDraft.email, password: signupDraft.password, consents, termsVersion: TERMS_VERSION };
      await (signupDraft.type === 'kakao' ? kakaoSignup(payload) : signup(payload));

      saveNotificationSettings({
        ...loadNotificationSettings(),
        email: agreements.notification,
      });
      setSignedInStatus(true);
      setIsCompleted(true);
      setSignupDraft(null);
      setSignupFeedback(null);
      navigate('/home', {
        state: { onboarding: true, onboardingKey: signupDraft.email },
        replace: true,
      });
    } catch (requestError) {
      const fieldMessages = requestError.fields
        ?.map(({ message }) => message)
        .filter(Boolean)
        .join(' ');

      const signupFieldError = requestError.fields?.some(({ field }) =>
        ['email', 'password'].some(
          (name) => field === name || field?.startsWith(`${name}.`) || field?.startsWith(`${name}[`),
        ),
      );
      const credentialError =
        [
          'DUPLICATE_EMAIL',
          'INVALID_PASSWORD_FORMAT',
          'EMAIL_NOT_VERIFIED',
        ].includes(requestError.code) ||
        (requestError.code === 'VALIDATION_FAILED' && signupFieldError);

      if (credentialError) {
        if (requestError.code === 'EMAIL_NOT_VERIFIED') {
          setSignupDraft((draft) => ({ ...draft, emailVerified: false, kakaoEmailVerified: false }));
        }
        setSignupFeedback({
          message: fieldMessages || requestError.message || '가입 정보를 다시 확인해 주세요.',
        });
        navigate(signupDraft.type === 'kakao' ? '/auth/kakao/signup' : '/auth/email/signup', { replace: true });
        return;
      }

      if (signupDraft.type === 'kakao' && requestError.code === 'KAKAO_SIGNUP_EXPIRED') {
        setSignupDraft(null);
        navigate('/auth', { replace: true, state: { notice: '카카오 로그인부터 다시 시작해 주세요.' } });
        return;
      }

      setError(fieldMessages || requestError.message || '가입을 완료하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!signupDraft) {
    return isCompleted ? null : <Navigate to="/auth" replace />;
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="consent-title">
          <p className={styles.eyebrow}>시작하기 전에</p>
          <h1 id="consent-title" className={styles.title}>
            보호자 동의가 필요해요
          </h1>
          <p className={styles.description}>
            아이 정보는 동화를 만드는 데만 사용해요. 마이에서 언제든 삭제할 수 있어요.
          </p>

          <form onSubmit={handleSubmit}>
            {error && (
              <p className={styles.errorMessage} role="alert">
                {error}
              </p>
            )}
            <div className={styles.consentList}>
              <label className={`${styles.row} ${styles.allRow}`}>
                <input
                  className={styles.nativeCheckbox}
                  type="checkbox"
                  checked={allAccepted}
                  onChange={toggleAll}
                />
                <CheckboxGraphic checked={allAccepted} />
                <span>모두 동의하기</span>
              </label>

              {agreementItems.map((item) => (
                <div className={styles.row} key={item.id}>
                  <label className={styles.optionLabel}>
                    <input
                      className={styles.nativeCheckbox}
                      type="checkbox"
                      checked={agreements[item.id]}
                      onChange={() => toggleAgreement(item.id)}
                    />
                    <CheckboxGraphic checked={agreements[item.id]} />
                    <span>{item.label}</span>
                  </label>
                  <button
                    className={styles.viewButton}
                    type="button"
                    disabled
                    title="약관 전문이 제공되면 연결됩니다"
                  >
                    보기
                  </button>
                </div>
              ))}
            </div>

            <button
              className={styles.submitButton}
              type="submit"
              disabled={!requiredAccepted || isSubmitting}
            >
              {isSubmitting ? '가입 중…' : '시작하기'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default GuardianConsentPage;
