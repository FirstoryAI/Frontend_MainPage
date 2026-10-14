import Header from '../../components/layout/Header';
import AuthCard from '../../features/auth/components/AuthCard';
import landingBackground from '../../assets/images/landing-background.png';
import styles from './HomePage.module.css';

function HomePage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.hero}>
        <img
          className={styles.illustration}
          src={landingBackground}
          alt="침대에서 동화책을 읽는 아이와 캐릭터 일러스트"
        />
        <AuthCard />
      </main>
    </div>
  );
}

export default HomePage;
