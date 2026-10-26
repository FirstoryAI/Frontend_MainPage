import { useState } from 'react';

// 서버가 준 그림 주소가 비었거나 열리지 않을 때(404 등) 깨진 그림 아이콘 대신 fallback을 보여줘요.
function SafeImage({ src, fallback = null, ...imgProps }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) return fallback;

  return <img src={src} onError={() => setFailedSrc(src)} {...imgProps} />;
}

export default SafeImage;
