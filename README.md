# BrawlGG

Brawl Stars 전적/랭킹 조회를 위한 `서버 + 앱 뷰` 통합 레포입니다.

현재 구조는 클린 아키텍처 원칙에 맞춰 책임을 분리했습니다.

## 구조

```text
apps/
  server/
    src/
      domain/           # 비즈니스 규칙, 에러, 순수 함수
      application/      # 유스케이스/서비스
      infrastructure/   # 외부 API, OAuth, 세션 구현체
      presentation/     # HTTP 라우팅/응답/정적 파일 서빙
  web/
    public/             # 정적 HTML/CSS
    src/
      domain/           # 뷰 도메인 포맷터
      application/      # 화면에서 쓰는 API 유스케이스
      presentation/     # DOM 선택/렌더링
      shared/           # 공통 HTTP 클라이언트
```

## 핵심 기능

- 플레이어 태그 기반 프로필/전투기록 조회
- 국가/글로벌 랭킹 조회
- Supercell OAuth2 (Authorization Code + PKCE)
- HttpOnly 세션 쿠키 인증
- API 로그인 필수화 옵션 (`REQUIRE_LOGIN_FOR_API=true`)

## 실행

1. 환경 변수 설정

```bash
cp .env.example .env
# 또는 쉘 환경 변수로 직접 export
```

2. 서버 실행

```bash
npm run dev
```

3. 접속

- [http://localhost:3000](http://localhost:3000)

## 환경 변수

- `BRAWL_API_TOKEN`: Brawl Stars API 토큰
- `REQUIRE_LOGIN_FOR_API`: API 요청에 로그인 필수 여부
- `SESSION_SECRET`: 세션 서명 키
- `SUPERCELL_OAUTH_*`: OAuth 제공자 설정

추가 옵션:

- `BRAWL_API_BASE_URL`
- `SESSION_COOKIE_NAME`
- `SESSION_TTL_SEC`
- `OAUTH_STATE_TTL_MS`

## API 엔드포인트

- `GET /api/health`
- `GET /api/player/:tag`
- `GET /api/player/:tag/battlelog`
- `GET /api/rankings/players?country=global&limit=20`
- `GET /api/auth/me`
- `GET /api/auth/supercell/start?return_to=/`
- `GET /api/auth/supercell/callback`
- `POST /api/auth/logout`

## 참고 링크

- [Brawl Stars Developer Portal](https://developer.brawlstars.com)
- [Supercell ID](https://id.supercell.com)
- [RFC 7636 (PKCE)](https://www.rfc-editor.org/rfc/rfc7636.html)
