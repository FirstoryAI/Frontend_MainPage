# FIRSTORY Frontend

FIRSTORY의 랜딩 및 인증 진입 화면을 구현한 React 프론트엔드입니다. Figma의 `start` 노드(`613:1044`)를 기준으로 구성했습니다.

## 시작하기

```bash
npm install
npm run dev
```

환경 변수는 `.env.example`을 복사해 `.env`에서 관리합니다.

```dotenv
VITE_API_BASE_URL=
```

## 명령어

- `npm run dev`: Vite 개발 서버 실행
- `npm run lint`: ESLint 검사
- `npm run build`: 프로덕션 빌드
- `npm run preview`: 빌드 결과 미리보기

## 구조

```text
src/
├── app/                  # 앱 셸과 라우터
├── assets/               # Figma 이미지, 아이콘, 로컬 폰트
├── components/layout/    # 페이지 공통 레이아웃
├── features/auth/        # 인증 도메인 UI
├── pages/                # 라우트 단위 페이지
├── services/             # 공통 API 클라이언트
└── styles/               # 리셋, 전역 스타일, 디자인 토큰
```

현재 인증 흐름은 `/` → `/auth/email/signup` → `/auth/consent`로 연결됩니다. 이메일 가입은 브라우저 형식 검증만 수행하며, 실제 계정 생성 API는 아직 호출하지 않습니다. 카카오 인증, 이메일 로그인, 약관 전문과 동의 완료 이후 온보딩 라우트는 관련 사양과 화면이 확정된 뒤 `features/auth` 내부에 연결하세요.
