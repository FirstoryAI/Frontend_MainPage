import DashboardPage from '../DashboardPage/DashboardPage';
import { useSignedIn } from '../../features/auth/useSignedIn';
import styles from './HomePage.module.css';

function HomePage() {
  const isSignedIn = useSignedIn();

  if (isSignedIn === null) {
    return <div className={styles.loading} role="status" aria-label="홈 화면을 불러오는 중" />;
  }

  return <DashboardPage guest={!isSignedIn} />;
}

export default HomePage;
