# BrawlGG

Brawl Stars 전적/랭킹 확인용 웹 앱 + OAuth 인증 서버 예제입니다.

## 기능

- 플레이어 태그로 프로필 조회
- 최근 전투 기록 조회
- 글로벌/국가별 플레이어 랭킹 조회
- API 토큰 서버 보관 (클라이언트 노출 방지)
- OAuth2 Authorization Code + PKCE 로그인
- 세션 쿠키 기반 로그인 유지, 로그아웃, 내 인증 상태 조회

## 빠른 실행

1. 환경 변수 준비
   - `.env.example` 값을 복사해서 쉘 환경변수로 설정
   - 최소값: `BRAWL_API_TOKEN`
2. 서버 실행
   - `npm run dev`
3. 접속
   - `http://localhost:3000`

## 환경 변수 핵심

- `BRAWL_API_TOKEN`: Brawl Stars 데이터 API 조회용 Bearer 토큰
- `REQUIRE_LOGIN_FOR_API`: `true`면 조회 API 호출에 로그인 필수
- `SESSION_SECRET`: 세션 서명용 시크릿
- `SUPERCELL_OAUTH_*`: OAuth 제공자 설정

### OAuth 필수 값

- `SUPERCELL_OAUTH_CLIENT_ID`
- `SUPERCELL_OAUTH_AUTHORIZATION_URL`
- `SUPERCELL_OAUTH_TOKEN_URL`
- `SUPERCELL_OAUTH_REDIRECT_URI`

선택 값:

- `SUPERCELL_OAUTH_CLIENT_SECRET`
- `SUPERCELL_OAUTH_USERINFO_URL`
- `SUPERCELL_OAUTH_SCOPE`
- `SUPERCELL_OAUTH_AUDIENCE`

## 내부 API

데이터 API:

- `GET /api/player/:tag`
- `GET /api/player/:tag/battlelog`
- `GET /api/rankings/players?country=global&limit=20`

인증 API:

- `GET /api/auth/me`
- `GET /api/auth/supercell/start?return_to=/`
- `GET /api/auth/supercell/callback`
- `POST /api/auth/logout`

## 참고

- Brawl Stars 개발자 포털: [https://developer.brawlstars.com](https://developer.brawlstars.com)
- Supercell ID 페이지: [https://id.supercell.com](https://id.supercell.com)

OAuth 클라이언트(엔드포인트/클라이언트 ID 등)는 제공자 측에서 발급/등록된 값이 있어야 실제 로그인이 동작합니다.

# BrawlGG
