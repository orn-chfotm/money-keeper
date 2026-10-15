# money-keeper

개인 가계부 앱. 루트는 두 독립 프로젝트를 관리하는 상위 디렉토리이며, 루트에는 `package.json`이 없다.

## 구조

```
money-keeper/
├── backend/    # Node 24 + TypeScript + Express 5 + Drizzle ORM, PostgreSQL 16 (docker compose)
├── frontend/   # Next.js (App Router) + TypeScript
└── docs/       # 요구사항·화면·아키텍처·계산 규칙·검증 기준 (docs/00-index.md부터 읽는다)
```

`frontend/`와 `backend/`는 각각 별도 서버에 배포하는 독립 프로젝트다. 의존성 설치·실행·빌드·테스트를 각 디렉토리에서 따로 한다.

## 포트

| 대상 | 포트 |
| --- | --- |
| Frontend | 3000 |
| Backend | 4000 |
| PostgreSQL | 5432 (`backend/.env`의 `DB_PORT`로 변경 가능) |

## 로컬 실행 순서

요구 사항: Node 24 이상, Docker.

1. DB와 Backend

   ```sh
   cd backend
   cp .env.example .env
   docker compose up -d      # money-keeper-postgres (money_keeper, money_keeper_test DB)
   npm install
   npm run db:migrate
   npm run dev               # http://localhost:4000/health
   ```

2. Frontend

   ```sh
   cd frontend
   cp .env.example .env.local
   npm install
   npm run dev               # http://localhost:3000
   ```

## 테스트

- Backend 테스트는 `backend/.env`의 `TEST_DATABASE_URL`을 사용하며, 이 값이 없으면 실행되지 않는다. DB 이름이 `_test`로 끝나지 않으면 테스트를 중단한다.
- `npm test`가 테스트 DB에 마이그레이션을 자동 적용하고, 각 테스트 전에 테스트 DB의 기록을 비운다. 개발 DB에는 영향이 없다.

```sh
cd backend && npm test
cd frontend && npm test
```

## DB 스키마 변경

1. `backend/src/db/schema.ts` 수정
2. `npm run db:generate` — `backend/drizzle/`에 마이그레이션 SQL 생성. 생성된 SQL을 확인하고 함께 커밋한다.
3. `npm run db:migrate` — 개발 DB(`DATABASE_URL`)에 적용. 테스트 DB는 `npm test` 실행 시 자동 적용된다.

## 주의

- `NEXT_PUBLIC_API_BASE_URL`은 Next.js **빌드 시점에 번들에 고정**된다. 배포 환경마다 해당 값으로 frontend를 다시 빌드해야 한다.
- `.env` 파일은 커밋하지 않는다. `.env.example`만 커밋한다.
- `backend/docker-compose.yml`의 DB 계정·비밀번호는 로컬 개발 전용이다.
- DB 스키마 변경은 `npm run db:generate` → `npm run db:migrate`로만 반영한다(`drizzle-kit push` 사용 금지).
