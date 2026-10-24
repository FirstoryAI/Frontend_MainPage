import { useEffect, useRef, useState } from 'react';
import closeIcon from '../../../assets/notification/close.svg';
import styles from './TermsModal.module.css';

function TermsModal({ onClose }) {
  const closeButton = useRef(null);
  const [dialogScale, setDialogScale] = useState(1);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButton.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    const updateScale = () => {
      const headerHeight = window.innerWidth <= 760
        ? 76
        : window.innerHeight <= 850 ? 88 : 109;
      const widthScale = window.innerWidth <= 760
        ? (window.innerWidth - 32) / 815
        : window.innerWidth / 1440;
      const heightScale = (window.innerHeight - headerHeight - 32) / 596;
      setDialogScale(Math.max(0.4, Math.min(1, widthScale, heightScale)));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.dialog}
        style={{ '--dialog-scale': dialogScale }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className={styles.title} id="terms-title">FIRSTORY 이용약관</h2>
        <button
          ref={closeButton}
          className={styles.closeButton}
          type="button"
          onClick={onClose}
          aria-label="이용약관 닫기"
        >
          <img src={closeIcon} alt="" />
        </button>
        <div className={styles.document} tabIndex="0" aria-label="FIRSTORY 이용약관 전문">
          <p>제1조 (목적)</p>
          <p>이 약관은 【운영 주체명】(이하 &quot;회사&quot;)가 제공하는 FIRSTORY 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 정하는 것을 목적으로 합니다.</p>
          <p>제2조 (정의)</p>
          <ol>
            <li>&quot;서비스&quot;란 회원이 입력한 아이의 상황과 정보를 바탕으로 맞춤형 동화(디지털북)와 부모용 활용 가이드를 생성·제공하고, 부모와 아이의 공동 독서를 지원하는 FIRSTORY 웹·앱 서비스를 말합니다.</li>
            <li>&quot;회원&quot;이란 이 약관에 동의하고 회원가입을 완료하여 서비스를 이용하는 만 14세 이상의 보호자를 말합니다.</li>
            <li>&quot;아이&quot;란 회원이 법정대리인으로서 서비스에 정보를 입력하는 자녀 또는 보호 대상 아동을 말합니다.</li>
            <li>&quot;입력 정보&quot;란 회원이 서비스에 입력한 상황 정보, 아이 정보, 전달하고 싶은 메시지, AI 인터뷰 답변 등을 말합니다.</li>
            <li>&quot;생성물&quot;이란 서비스가 입력 정보를 바탕으로 생성한 동화의 글·이미지, 대화 트리거, 부모용 활용 가이드 등을 말합니다.</li>
            <li>&quot;FIRSTORY AI&quot;란 입력 정리, 동화 생성, 활용 가이드 생성을 수행하는 서비스 내 생성형 인공지능 기능을 말합니다.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

export default TermsModal;
