import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SafeImage from './SafeImage';
import { setCoverFrameRatio } from '../coverLayout';
import bookCoverStyles from './BookCover.module.css';
import fallbackCover from '../../../assets/images/story-complete-cover.webp';
import ray01 from '../../../assets/story-complete/ray-01.svg';
import ray02 from '../../../assets/story-complete/ray-02.svg';
import ray03 from '../../../assets/story-complete/ray-03.svg';
import ray04 from '../../../assets/story-complete/ray-04.svg';
import ray05 from '../../../assets/story-complete/ray-05.svg';
import ray06 from '../../../assets/story-complete/ray-06.svg';
import ray07 from '../../../assets/story-complete/ray-07.svg';
import ray08 from '../../../assets/story-complete/ray-08.svg';
import ray09 from '../../../assets/story-complete/ray-09.svg';
import ray10 from '../../../assets/story-complete/ray-10.svg';
import sparkle01 from '../../../assets/story-complete/sparkle-01.svg';
import sparkle02 from '../../../assets/story-complete/sparkle-02.svg';
import sparkle03 from '../../../assets/story-complete/sparkle-03.svg';
import sparkle04 from '../../../assets/story-complete/sparkle-04.svg';
import styles from './CompleteStep.module.css';

const rays = [ray01, ray02, ray03, ray04, ray05, ray06, ray07, ray08, ray09, ray10];
const sparkles = [sparkle01, sparkle02, sparkle03, sparkle04];

function viewportScale() {
  return Math.min(1, window.innerWidth / 620, window.innerHeight / 960);
}

function CompleteStep({ storyId, title, coverUrl }) {
  const navigate = useNavigate();
  const [scale, setScale] = useState(viewportScale);

  useEffect(() => {
    const updateScale = () => setScale(viewportScale());
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <section className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="complete-title">
      <div className={styles.content} style={{ '--complete-scale': scale }}>
        <div className={styles.artwork}>
          <div className={styles.rays} aria-hidden="true">
            {rays.map((ray, index) => <img className={styles.ray} src={ray} alt="" key={ray} data-ray={index + 1} />)}
          </div>
          <div className={styles.coverGlow}>
            <div
              className={`${styles.bookFrame} ${bookCoverStyles.bookCover}`}
              data-cover-frame
              style={{ '--cover': `url(${JSON.stringify(coverUrl || fallbackCover)})` }}
            >
              <div className={bookCoverStyles.bookFace}>
                <div className={bookCoverStyles.bookArt}>
                  <SafeImage
                    className={styles.cover}
                    src={coverUrl}
                    onLoad={setCoverFrameRatio}
                    alt={`${title || '완성된 동화'} 표지`}
                    fallback={<img className={`${styles.cover} ${styles.sampleCover}`} src={fallbackCover} alt="완성된 동화 표지 예시" />}
                  />
                </div>
              </div>
            </div>
          </div>
          {sparkles.map((sparkle, index) => <img className={styles.sparkle} src={sparkle} alt="" key={sparkle} data-sparkle={index + 1} />)}
        </div>

        <h1 className={styles.title} id="complete-title">제작이 완료되었어요</h1>
        <p className={styles.description}>우리 아이를 위한 동화가 완성되었어요. 서재에서 확인하실 수 있어요.</p>
        <button className={styles.cta} type="button" onClick={() => navigate(`/story/${storyId}/preview`)}>
          만들어진 동화 확인하기 <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

export default CompleteStep;
