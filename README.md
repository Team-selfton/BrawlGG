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
  mobile/
    src/
      domain/           # 모바일 도메인 포맷터
      application/      # 모바일 API 유스케이스
      presentation/     # RN 화면/컴포넌트
      shared/           # 런타임 설정/토큰 저장/HTTP 클라이언트
```

## 핵심 기능

- 플레이어 태그 기반 프로필/전투기록/오버뷰 조회
- 클럽 태그 기반 클럽/멤버 조회
- 멀티 태그 동시 조회 (Multi-Search)
- 국가/글로벌 랭킹 조회 (플레이어/클럽/브롤러)
- 국가/지역 목록 및 지역 상세 조회
- 이벤트/이벤트 로테이션 조회
- 브롤러 목록 + 브롤러 상세 조회
- Supercell OAuth2 (Authorization Code + PKCE)
- JWT Access/Refresh 토큰 인증 + 재발급
- API 로그인 필수화 옵션 (`REQUIRE_LOGIN_FOR_API=true`)
- Expo 기반 React Native 모바일 앱 (`apps/mobile`)
- 모바일 OAuth 딥링크 콜백 (`brawlgg://auth-callback`)

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

- 운영 서버: [https://brawlgg-server.dsmhs.kr](https://brawlgg-server.dsmhs.kr)
- 로컬 서버: [http://localhost:3000](http://localhost:3000)

## 모바일 앱 실행 (Expo)

```bash
cd apps/mobile
npm install
npm run start
```

- iOS 시뮬레이터: `npm run ios`
- Android 에뮬레이터: `npm run android`

모바일 앱 기본 API 주소는 `https://brawlgg-server.dsmhs.kr`로 설정되어 있습니다.
필요하면 앱 내 설정 카드에서 API 주소를 변경할 수 있습니다.

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
- `MOBILE_APP_SCHEME` (기본: `brawlgg`)

## API 엔드포인트

- `GET /api/health`
- `GET /api/docs/openapi.json` (OpenAPI 명세 JSON)
- `GET /api/player/:tag`
- `GET /api/player/:tag/overview`
- `GET /api/player/:tag/battlelog`
- `GET /api/club/:tag`
- `GET /api/club/:tag/members`
- `GET /api/players/multi?tags=2PP,8Q8`
- `GET /api/rankings/players?country=global&limit=20`
- `GET /api/rankings/clubs?country=global&limit=20`
- `GET /api/rankings/brawlers?country=global&brawlerId=16000000&limit=20`
- `GET /api/brawlers`
- `GET /api/brawlers/:brawlerId`
- `GET /api/locations?limit=50`
- `GET /api/locations/:locationId`
- `GET /api/events`
- `GET /api/events/rotation`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `GET /api/auth/supercell/start?return_to=/`
- `GET /api/auth/supercell/callback`
- `POST /api/auth/logout`

## Swagger 문서

- 운영 Swagger UI: [https://brawlgg-server.dsmhs.kr/docs](https://brawlgg-server.dsmhs.kr/docs)
- 운영 OpenAPI JSON: [https://brawlgg-server.dsmhs.kr/api/docs/openapi.json](https://brawlgg-server.dsmhs.kr/api/docs/openapi.json)
- 로컬 Swagger UI: [http://localhost:3000/docs](http://localhost:3000/docs)
- 로컬 OpenAPI JSON: [http://localhost:3000/api/docs/openapi.json](http://localhost:3000/api/docs/openapi.json)

## 모바일 출시 (EAS Build)

`apps/mobile`에서:

```bash
npx eas login
npx eas build -p ios --profile production
npx eas build -p android --profile production
```

출시 전 체크:

- App Store / Play Console 번들 식별자 확인 (`apps/mobile/app.json`)
- 서버 배포 주소를 모바일 앱 설정 또는 `app.json > extra.apiBaseUrl`로 지정
- Supercell OAuth 콘솔에 모바일 스킴 콜백 등록: `brawlgg://auth-callback`

## 인증 구조 (JWT)

1. `/api/auth/supercell/start`로 로그인 시작
2. OAuth 콜백에서 `accessToken` + `refreshToken` 발급
3. API 호출 시 `Authorization: Bearer <accessToken>` 사용
4. 만료 시 `POST /api/auth/refresh`로 재발급

### 빠른 확인 예시

```bash
curl https://brawlgg-server.dsmhs.kr/api/player/2PP
curl https://brawlgg-server.dsmhs.kr/api/player/2PP/overview
curl https://brawlgg-server.dsmhs.kr/api/player/2PP/battlelog
curl https://brawlgg-server.dsmhs.kr/api/club/YQ0L8C
curl https://brawlgg-server.dsmhs.kr/api/club/YQ0L8C/members
curl "https://brawlgg-server.dsmhs.kr/api/rankings/players?country=kr&limit=20"
curl "https://brawlgg-server.dsmhs.kr/api/rankings/clubs?country=global&limit=20"
curl "https://brawlgg-server.dsmhs.kr/api/rankings/brawlers?country=global&brawlerId=16000000&limit=20"
curl "https://brawlgg-server.dsmhs.kr/api/locations?limit=50"
curl "https://brawlgg-server.dsmhs.kr/api/locations/global"
curl "https://brawlgg-server.dsmhs.kr/api/events"
curl "https://brawlgg-server.dsmhs.kr/api/events/rotation"
curl "https://brawlgg-server.dsmhs.kr/api/brawlers/16000000"
curl "https://brawlgg-server.dsmhs.kr/api/players/multi?tags=2PP,8Q8,YQ9U"
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
