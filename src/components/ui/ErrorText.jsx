import { useLocation, useNavigate } from 'react-router-dom';
import styles from './ErrorText.module.css';

// 서버가 로그인하지 않았다고 알려 줄 때의 문구('로그인이 필요해요.')예요.
const LOGIN_REQUIRED = /^로그인이 필요/;

// 화면에 보여줄 오류 문장이에요. 로그인이 필요하다는 안내면 눌러서 로그인 화면으로 갈 수 있게 해요.
// 로그인하고 나면 지금 보던 화면으로 돌아와요. 바깥 <p>는 각 화면이 자기 모양으로 감싸서 써요.
function ErrorText({ message }) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!LOGIN_REQUIRED.test(message)) return message;

  return (
    <button
      className={styles.link}
      type="button"
      title="로그인 화면으로 이동"
      onClick={() => navigate('/auth/email/login', { state: { from: location.pathname } })}
    >
      {message}
    </button>
  );
}

export default ErrorText;
