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
      infrastructure/   # 외부 API, OAuth, JWT 인증 구현체
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

- 플레이어 태그 기반 프로필/전투기록/오버뷰 조회
- 멀티 태그 동시 조회 (Multi-Search)
- 국가/글로벌 랭킹 조회 (플레이어/클럽/브롤러)
- Supercell OAuth2 (Authorization Code + PKCE)
- JWT Access/Refresh 토큰 인증 + 재발급
- API 로그인 필수화 옵션 (`REQUIRE_LOGIN_FOR_API=true`)

## 실행

1. 환경 변수 설정

```bash
cp .env.example .env
# 최소 필수: BRAWL_API_TOKEN
```

서버는 프로젝트 루트의 `.env`를 자동으로 읽습니다.

2. 서버 실행

```bash
npm run dev
```

3. 접속

- [http://localhost:3000](http://localhost:3000)

## 전적/통계/랭킹/배틀로그 조회 세팅

1. [Brawl Stars Developer Portal](https://developer.brawlstars.com)에서 API Key 발급
2. 발급한 토큰을 `.env`의 `BRAWL_API_TOKEN`에 입력
3. API Key 생성 시 서버 공인 IP를 허용 목록에 등록
4. `npm run dev` 실행 후 웹에서 플레이어 태그 검색

참고: OAuth 없이 먼저 조회만 하려면 `REQUIRE_LOGIN_FOR_API=false` 유지

## 환경 변수

- `BRAWL_API_TOKEN`: Brawl Stars API 토큰
- `REQUIRE_LOGIN_FOR_API`: API 요청에 로그인 필수 여부
- `JWT_SECRET`: JWT 서명 키
- `SUPERCELL_OAUTH_*`: OAuth 제공자 설정

추가 옵션:

- `BRAWL_API_BASE_URL`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `JWT_ACCESS_TTL_SEC`
- `JWT_REFRESH_TTL_SEC`
- `OAUTH_STATE_TTL_MS`

## API 엔드포인트

- `GET /api/health`
- `GET /api/docs/openapi.json` (OpenAPI 명세 JSON)
- `GET /api/player/:tag`
- `GET /api/player/:tag/overview`
- `GET /api/player/:tag/battlelog`
- `GET /api/players/multi?tags=2PP,8Q8`
- `GET /api/rankings/players?country=global&limit=20`
- `GET /api/rankings/clubs?country=global&limit=20`
- `GET /api/rankings/brawlers?country=global&brawlerId=16000000&limit=20`
- `GET /api/brawlers`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `GET /api/auth/supercell/start?return_to=/`
- `GET /api/auth/supercell/callback`
- `POST /api/auth/logout`

## Swagger 문서

- Swagger UI: [http://localhost:3000/docs](http://localhost:3000/docs)
- OpenAPI JSON: [http://localhost:3000/api/docs/openapi.json](http://localhost:3000/api/docs/openapi.json)

## 인증 구조 (JWT)

1. `/api/auth/supercell/start`로 로그인 시작
2. OAuth 콜백에서 `accessToken` + `refreshToken` 발급
3. API 호출 시 `Authorization: Bearer <accessToken>` 사용
4. 만료 시 `POST /api/auth/refresh`로 재발급

### 빠른 확인 예시

```bash
curl http://127.0.0.1:3000/api/player/2PP
curl http://127.0.0.1:3000/api/player/2PP/overview
curl http://127.0.0.1:3000/api/player/2PP/battlelog
curl "http://127.0.0.1:3000/api/rankings/players?country=kr&limit=20"
curl "http://127.0.0.1:3000/api/rankings/clubs?country=global&limit=20"
curl "http://127.0.0.1:3000/api/rankings/brawlers?country=global&brawlerId=16000000&limit=20"
curl "http://127.0.0.1:3000/api/players/multi?tags=2PP,8Q8,YQ9U"
```

`/api/player/:tag` 응답으로 트로피, 최고 트로피, 레벨, 3v3 승리, 솔로/듀오 승리 등 통계를 확인할 수 있습니다.

## OP.GG 기능 매핑 (BrawlGG 기준)

| OP.GG 기능 | BrawlGG 구현 상태 |
| --- | --- |
| 단일 전적 검색 | `GET /api/player/:tag/overview` + 웹 플레이어 검색 UI |
| 멀티 검색 | `GET /api/players/multi` + 멀티 검색 UI |
| 리더보드 | 플레이어/클럽/브롤러 랭킹 지원 |
| 최근 성과 지표(승률 트렌드) | 최근 10판 기준 승/패/승률/트로피 변화 계산 |
| 챔피언(브롤러) 메타 | 브롤러별 리더보드 기반 근사치 제공 |

제한 사항: 공식 Supercell API만 사용하므로 LoL OP.GG의 룬/아이템/라인 카운터 수준 데이터는 제공되지 않습니다.

## 참고 링크

- [Brawl Stars Developer Portal](https://developer.brawlstars.com)
- [Supercell ID](https://id.supercell.com)
- [RFC 7636 (PKCE)](https://www.rfc-editor.org/rfc/rfc7636.html)
