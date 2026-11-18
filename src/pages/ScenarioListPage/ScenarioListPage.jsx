import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import HomeScenarioModal from '../../features/home/components/HomeScenarioModal';
import { useSignedIn } from '../../features/auth/useSignedIn';
import { listScenarios, scenarioCategoryLabel } from '../../features/home/scenarios';
import { categories, categoryDisplayNames, lockedCategories } from '../../features/story/constants';
import iconLock from '../../assets/icons/icon-lock.svg';
import iconBack from '../../assets/images/scenarios/day-design/back-arrow.svg';
import avatarProfile from '../../assets/images/scenarios/day-design/profile.svg';
import dayBell from '../../assets/images/scenarios/day-design/notification.svg';
import friendWave from '../../assets/images/home/day-design/friend-wave.svg';
import familyWave from '../../assets/images/home/day-design/family-wave.svg';
import kindergartenWave from '../../assets/images/home/day-design/kindergarten-wave.svg';
import tantrumWave from '../../assets/images/home/day-design/tantrum-wave.svg';
import friendCharacter from '../../assets/images/home/day-design/friend-character.webp';
import characterSheet from '../../assets/images/home/day-design/character-sheet.webp';
import kindergartenCharacter from '../../assets/images/home/day-design/kindergarten-character.webp';
import styles from './ScenarioListPage.module.css';

const ALL = '전체';
// 잠긴 카테고리(이별 · 죽음)는 카드는 숨기고 필터만 자물쇠로 남겨 둬요.
// '기타'(그 밖의 일) 이야기는 나중에 넣기로 해서, 그때까지 이 화면에서는 칩을 숨겨요. (동화 만들기에서는 고를 수 있어요)
// 기타 이야기를 넣으면 이 목록에서 빼 주세요.
const hiddenCategories = ['그 밖의 일'];
const filters = [ALL, ...categories.filter((category) => !hiddenCategories.includes(category))];
const cardWaves = { friend: friendWave, emotion: familyWave, kindergarten: kindergartenWave, tantrum: tantrumWave, habit: familyWave };
const designedCards = new Set(['friend', 'emotion', 'kindergarten', 'tantrum']);
const dayBackground = '/images/scenarios-background.webp';

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
      <div className={styles.shell} data-theme="day" inert={selectedScenario !== null}>
        <img className={styles.background} src={dayBackground} alt="" fetchPriority="high" decoding="async" />
        <Sidebar guest={guest} compact showLogo={false} />

        <div className={styles.main}>
          <div className={styles.topbar}>
            {guest ? (
              <button className={styles.guestBell} type="button" onClick={() => navigate('/auth')} aria-label="로그인 후 알림 보기">
                <img src={dayBell} alt="" />
              </button>
            ) : <NotificationBell iconSrc={dayBell} />}
            <button
              className={styles.avatarButton}
              type="button"
              onClick={() => navigate(guest ? '/auth' : '/mypage')}
              aria-label={guest ? '로그인' : '마이페이지'}
            >
              <img src={avatarProfile} alt="" />
            </button>
          </div>

          <main className={styles.content}>
            <header className={styles.heading}>
              <Link className={styles.back} to={guest ? '/' : '/home'} aria-label="홈으로 돌아가기">
                <img src={iconBack} alt="" />
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
                    {categoryDisplayNames[filter] ?? filter}
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
                      aria-label={`${scenarioCategoryLabel(scenario)}: ${scenario.accessibleTitle}`}
                      onClick={() => setSelectedScenario(scenario)}
                    >
                      <span className={styles.category}>{scenarioCategoryLabel(scenario)}</span>
                      <span className={styles.cardTitle}>{scenario.title}</span>
                      <img className={styles.cardWave} src={cardWaves[scenario.color]} alt="" />
                      {scenario.id === 'friend' && <img className={styles.friendCharacter} src={friendCharacter} alt="" />}
                      {scenario.id === 'emotion' && <span className={`${styles.spriteCrop} ${styles.familyCharacter}`}><img src={characterSheet} alt="" /></span>}
                      {scenario.id === 'kindergarten' && <span className={styles.kindergartenCharacter}><img src={kindergartenCharacter} alt="" /></span>}
                      {scenario.id === 'tantrum' && <span className={`${styles.spriteCrop} ${styles.tantrumCharacter}`}><img src={characterSheet} alt="" /></span>}
                      {!designedCards.has(scenario.id) && <img className={styles.fallbackCharacter} src={scenario.image} alt="" />}
                    </button>
                  </li>
                ))}
              </ul>
              {visibleScenarios.length === 0 && <p className={styles.empty}>해당하는 이야기가 아직 없어요.</p>}
            </div>
          </main>
        </div>
      </div>

      {selectedScenario && (
        <HomeScenarioModal
          scenario={selectedScenario}
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
