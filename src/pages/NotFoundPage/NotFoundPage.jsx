import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import styles from './NotFoundPage.module.css';

function NotFoundPage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.content}>
        <p className={styles.code}>404</p>
        <h1>페이지를 찾을 수 없어요</h1>
        <p>주소가 정확한지 확인하거나 홈으로 돌아가 주세요.</p>
        <Link to="/">홈으로 돌아가기</Link>
      </main>
    </div>
  );
}

export default NotFoundPage;
