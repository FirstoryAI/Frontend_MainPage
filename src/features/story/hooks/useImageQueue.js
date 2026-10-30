import { useEffect, useRef, useState } from 'react';

// 쪽 그림을 지금 보는 쪽에서 가까운 순서로 한 장씩 받아서 메모리에 담아 둬요. (지금 쪽 → 다음 쪽 → 앞 쪽 → 그다음…)
// 그림이 한 장에 수 MB라서 10장을 한 번에 받으면 느려요. 한 장씩 받으면 지금 보는 그림이 먼저 오고, 나머지는 뒤에서 채워져요.
// 서버가 그림을 캐시하지 않게 응답해도(로그인한 사용자의 그림이라 흔해요) 한 번 받은 그림을 큰 그림·썸네일·넘김 효과에서 다시 받지 않고 쓸 수 있어요.
//
// 돌려주는 sources는 { 서버 그림 주소 → 화면에서 쓸 주소 }예요.
// 받는 중인 그림은 아직 들어 있지 않고, 받지 못했으면 원래 주소가 들어 있어서 <img>가 직접 시도하다 안 되면 대체 화면을 보여줘요.
export function useImageQueue(urls, currentPage) {
  const [sources, setSources] = useState(() => new Map());
  const blobUrls = useRef(new Map());
  const requested = useRef(new Set());
  const mounted = useRef(true);
  // 주소 목록이 같으면 같은 것으로 봐서, 쪽을 넘길 때만 받는 순서를 다시 정해요.
  const key = urls.join('|');

  useEffect(() => {
    mounted.current = true;
    const blobs = blobUrls.current;
    return () => {
      mounted.current = false;
      blobs.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
      blobs.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    // 다시 만든 동화처럼 주소가 바뀌면 더 이상 쓰지 않는 그림은 메모리에서 비워요.
    const known = new Set(urls);
    blobUrls.current.forEach((blobUrl, url) => {
      if (known.has(url)) return;
      URL.revokeObjectURL(blobUrl);
      blobUrls.current.delete(url);
      requested.current.delete(url);
      setSources((current) => {
        const next = new Map(current);
        next.delete(url);
        return next;
      });
    });

    // 아직 안 받은 그림 중에 지금 쪽에서 가장 가까운 것을 골라요. (같은 거리면 앞 쪽보다 뒤 쪽을 먼저)
    const pickNext = () => {
      let best = null;
      urls.forEach((url, index) => {
        if (!url || requested.current.has(url)) return;
        const distance = Math.abs(index + 1 - currentPage) + (index + 1 < currentPage ? 0.5 : 0);
        if (!best || distance < best.distance) best = { url, distance };
      });
      return best?.url ?? null;
    };

    const store = (url, source) => {
      if (mounted.current) setSources((current) => new Map(current).set(url, source));
    };

    const loadNext = async () => {
      const url = pickNext();
      if (cancelled || !url) return;

      requested.current.add(url);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`image ${response.status}`);
        const blobUrl = URL.createObjectURL(await response.blob());
        if (mounted.current) blobUrls.current.set(url, blobUrl);
        else URL.revokeObjectURL(blobUrl);
        store(url, blobUrl);
      } catch {
        // 받지 못한 그림은 원래 주소를 그대로 둬요. <img>가 직접 시도하고, 안 되면 대체 화면이 나와요.
        store(url, url);
      }
      loadNext();
    };

    loadNext();
    return () => {
      cancelled = true;
    };
    // urls 대신 key를 봐요. 같은 주소들이 새 배열로 오더라도 다시 시작하지 않아요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, currentPage]);

  return sources;
}
