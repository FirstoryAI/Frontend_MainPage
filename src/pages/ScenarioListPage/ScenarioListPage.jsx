import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import HomeScenarioModal from '../../features/home/components/HomeScenarioModal';
import { useSignedIn } from '../../features/auth/useSignedIn';
import { listScenarios } from '../../features/home/scenarios';
import { lockedCategories } from '../../features/story/constants';
import iconBell from '../../assets/icons/icon-bell.svg';
import iconLock from '../../assets/icons/icon-lock.svg';
import iconBackSmall from '../../assets/icons/icon-back-small.svg';
import avatarProfile from '../../assets/icons/avatar-profile.svg';
import styles from './ScenarioListPage.module.css';

const ALL = '전체';
// 잠긴 카테고리(이별 · 죽음)는 카드는 숨기고 필터만 자물쇠로 남겨 둬요.
const filters = [ALL, ...new Set([...listScenarios.map((scenario) => scenario.category), ...lockedCategories])];

function ScenarioListPage() {
  const navigate = useNavigate();
  const isSignedIn = useSignedIn();
  const guest = isSignedIn === false;
  const [activeFilter, setActiveFilter] = useState(ALL);
  const [selectedScenario, setSelectedScenario] = useState(null);

  const visibleScenarios =
    activeFilter === ALL
      ? listScenarios
      : listScenarios.filter((scenario) => scenario.category === activeFilter);

  if (isSignedIn === null) {
    return <div className={styles.page} role="status" aria-label="목록을 불러오는 중" />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell} inert={selectedScenario !== null}>
        <Sidebar guest={guest} />

        <div className={styles.main}>
          <div className={styles.topbar}>
            {guest ? (
              <Link className={styles.loginLink} to="/auth">로그인</Link>
            ) : <><button
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
            </button></>}
          </div>

          <main className={styles.content}>
            <header className={styles.heading}>
              <Link className={styles.back} to={guest ? '/' : '/home'} aria-label="홈으로 돌아가기">
                <img src={iconBackSmall} alt="" />
              </Link>
              <h1 className={styles.title}>부모들의 이야기</h1>
              <p className={styles.description}>
                우리 아이와 비슷한 상황을 찾아보고, 대화의 실마리를 발견해 보세요!
              </p>
            </header>

            <div className={styles.filters} role="group" aria-label="상황 카테고리">
              {filters.map((filter) => {
                const locked = lockedCategories.includes(filter);
                return (
                  <button
                    className={`${styles.filter} ${
                      activeFilter === filter ? styles.filterActive : ''
                    }`}
                    type="button"
                    key={filter}
                    aria-pressed={activeFilter === filter}
                    disabled={locked}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                    {locked && <img className={styles.lockIcon} src={iconLock} alt="준비 중" />}
                  </button>
                );
              })}
            </div>

            <div className={styles.gridArea}>
              <ul className={styles.grid} aria-live="polite">
                {visibleScenarios.map((scenario) => (
                  <li key={scenario.id}>
                    <button
                      className={`${styles.card} ${styles[scenario.color]} ${styles[scenario.id] ?? ''}`}
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
            </div>
          </main>
        </div>
      </div>

      {selectedScenario && (
        <HomeScenarioModal
          scenario={selectedScenario}
          requiresLogin={guest}
          onClose={() => setSelectedScenario(null)}
          onStart={() => guest
            ? navigate('/auth')
            : navigate('/story/new', { state: { scenarioId: selectedScenario.id } })}
        />
      )}
    </div>
  );
}

export default ScenarioListPage;
