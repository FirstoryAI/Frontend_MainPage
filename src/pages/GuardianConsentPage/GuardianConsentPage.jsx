import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import checkboxChecked from '../../assets/icons/checkbox-checked.svg';
import checkboxUnchecked from '../../assets/icons/checkbox-unchecked.svg';
import { useSignupDraft } from '../../features/auth/SignupDraftContext';
import styles from './GuardianConsentPage.module.css';
import { loadNotificationSettings, saveNotificationSettings } from '../../features/profile/notificationSettings';
import { signup } from '../../services/authApi';

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
  { id: 'notification', label: '(선택) 동화가 완성되면 문자로 알림 받기' },
];

function CheckboxGraphic({ checked }) {
  return <img src={checked ? checkboxChecked : checkboxUnchecked} alt="" />;
}

function GuardianConsentPage() {
  const [agreements, setAgreements] = useState(initialAgreements);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      await signup({
        email: signupDraft.email,
        password: signupDraft.password,
        phone: signupDraft.phone,
        consents: {
          GUARDIAN: agreements.guardian,
          TERMS: agreements.terms,
          PRIVACY: agreements.privacy,
          SMS_NOTIFY: agreements.notification,
        },
        termsVersion: TERMS_VERSION,
      });

      saveNotificationSettings({
        ...loadNotificationSettings(),
        sms: agreements.notification,
      });
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
        ['email', 'password', 'phone'].some(
          (name) => field === name || field?.startsWith(`${name}.`) || field?.startsWith(`${name}[`),
        ),
      );
      const credentialError =
        [
          'DUPLICATE_EMAIL',
          'DUPLICATE_PHONE',
          'INVALID_PASSWORD_FORMAT',
          'INVALID_PHONE_FORMAT',
          'PHONE_NOT_VERIFIED',
        ].includes(requestError.code) ||
        (requestError.code === 'VALIDATION_FAILED' && signupFieldError);

      if (credentialError) {
        if (requestError.code === 'PHONE_NOT_VERIFIED') {
          setSignupDraft((draft) => ({ ...draft, phoneVerified: false }));
        }
        setSignupFeedback({
          message: fieldMessages || requestError.message || '가입 정보를 다시 확인해 주세요.',
        });
        navigate('/auth/email/signup', { replace: true });
        return;
      }

      setError(fieldMessages || requestError.message || '가입을 완료하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!signupDraft) {
    return <Navigate to="/auth/email/signup" replace />;
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
