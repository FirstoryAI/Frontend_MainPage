import { useEffect } from 'react';
import { Link, useRouteError } from 'react-router-dom';
import Header from '../components/layout/Header';
import styles from './RouteErrorPage.module.css';
import { isChunkLoadError, reloadOnceForNewVersion } from './chunkReload';

// 화면을 그리다 오류가 나면 기본 영어 오류 화면 대신 이 화면을 보여줘요.
// 새 버전 배포로 화면 파일을 못 불러온 거라면 먼저 한 번 새로 불러와서 스스로 고쳐 봐요.
function RouteErrorPage() {
  const error = useRouteError();
  const staleVersion = isChunkLoadError(error);

  useEffect(() => {
    if (staleVersion) reloadOnceForNewVersion(error);
  }, [staleVersion, error]);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.content} role="alert">
        <h1>화면을 불러오지 못했어요</h1>
        <p>{staleVersion ? '새 버전으로 바뀌었어요. 새로고침하면 바로 볼 수 있어요.' : '잠깐 문제가 생겼어요. 다시 시도해 주세요.'}</p>
        <button className={styles.action} type="button" onClick={() => window.location.reload()}>다시 시도하기</button>
        <Link className={styles.home} to="/">홈으로 돌아가기</Link>
      </main>
    </div>
  );
}

export default RouteErrorPage;
