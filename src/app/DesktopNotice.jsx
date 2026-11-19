import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import mascotSheet from '../assets/images/home/day-design/kindergarten-character.webp';
import closeIcon from '../assets/icons/icon-close.svg';
import { markDesktopNoticeSeen } from './desktopNoticeVisibility';
import styles from './DesktopNotice.module.css';

// 데스크톱으로 접속하면 첫 화면에 뜨는 안내예요. 태블릿·휴대폰으로 접속하길 권해요. (Figma 2237:1536)
function DesktopNotice({ onClose }) {
  const dialog = useRef(null);
  const close = useCallback(() => {
    markDesktopNoticeSeen();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    // 처음 뜰 때는 팝업에 포커스를 둬요. (X에 두면 디자인에 없는 포커스 테두리가 바로 보여요. Tab을 누르면 X로 가요)
    dialog.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [close]);

  return createPortal(
    <div className={styles.backdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <section ref={dialog} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="desktop-notice-text" tabIndex={-1}>
        <span className={styles.mascot} aria-hidden="true">
          <img src={mascotSheet} alt="" />
        </span>
        <p className={styles.text} id="desktop-notice-text">
          데스크톱 환경에서는 화면이 최적화되지 않을 수 있으므로,<br />
          태블릿 또는 모바일 기기로 접속하시는 것을 권장드려요.
        </p>
        <button className={styles.close} type="button" onClick={close} aria-label="안내 닫기" data-close-hit-area>
          <img src={closeIcon} alt="" />
        </button>
      </section>
    </div>, document.body,
  );
}

export default DesktopNotice;
