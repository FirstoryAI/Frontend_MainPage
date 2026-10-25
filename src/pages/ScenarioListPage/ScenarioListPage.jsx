import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import HomeScenarioModal from '../../features/home/components/HomeScenarioModal';
import { scenarios } from '../../features/home/scenarios';
import iconBell from '../../assets/icons/icon-bell.svg';
import iconBackSmall from '../../assets/icons/icon-back-small.svg';
import avatarProfile from '../../assets/icons/avatar-profile.svg';
import styles from './ScenarioListPage.module.css';

const ALL = '전체';
const filters = [ALL, ...new Set(scenarios.map((scenario) => scenario.category))];

function ScenarioListPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState(ALL);
  const [selectedScenario, setSelectedScenario] = useState(null);

  const visibleScenarios =
    activeFilter === ALL
      ? scenarios
      : scenarios.filter((scenario) => scenario.category === activeFilter);

  return (
    <div className={styles.page}>
      <div className={styles.shell} inert={selectedScenario !== null}>
        <Sidebar />

        <div className={styles.main}>
          <div className={styles.topbar}>
            <button
              className={styles.bellButton}
              type="button"
              aria-label="알림"
              disabled
              title="알림 화면이 준비되면 연결됩니다"
            >
              <img src={iconBell} alt="" />
            </button>
            <button
              className={styles.avatarButton}
              type="button"
              onClick={() => navigate('/mypage')}
              aria-label="마이페이지"
            >
              <img src={avatarProfile} alt="" />
            </button>
          </div>

          <main className={styles.content}>
            <header className={styles.heading}>
              <Link className={styles.back} to="/home" aria-label="홈으로 돌아가기">
                <img src={iconBackSmall} alt="" />
              </Link>
              <h1 className={styles.title}>부모들의 이야기</h1>
              <p className={styles.description}>
                우리 아이와 비슷한 상황을 찾아보고, 대화의 실마리를 발견해 보세요!
              </p>
            </header>

            <div className={styles.filters} role="group" aria-label="상황 카테고리">
              {filters.map((filter) => (
                <button
                  className={`${styles.filter} ${
                    activeFilter === filter ? styles.filterActive : ''
                  }`}
                  type="button"
                  key={filter}
                  aria-pressed={activeFilter === filter}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>

            <ul className={styles.grid} aria-live="polite">
              {visibleScenarios.map((scenario) => (
                <li key={scenario.id}>
                  <button
                    className={`${styles.card} ${styles[scenario.color]}`}
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={`${scenario.category}: ${scenario.accessibleTitle}`}
                    onClick={() => setSelectedScenario(scenario)}
                  >
                    <span className={styles.category}>{scenario.category}</span>
                    <span className={styles.cardTitle}>{scenario.title}</span>
                    <span className={styles.cardDescription}>{scenario.description}</span>
                    <img className={styles.cardImage} src={scenario.image} alt="" />
                  </button>
                </li>
              ))}
            </ul>
          </main>
        </div>
      </div>

      {selectedScenario && (
        <HomeScenarioModal
          scenario={selectedScenario}
          onClose={() => setSelectedScenario(null)}
          onStart={() =>
            navigate('/story/new', { state: { scenarioId: selectedScenario.id } })
          }
        />
      )}
    </div>
  );
}

export default ScenarioListPage;
