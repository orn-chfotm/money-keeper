---
description: "money-keeper 저장소 구조, 로컬 실행·테스트, DB 스키마 변경과 롤백 절차를 안내합니다."
---

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

DB 스키마 변경은 위 절차로만 반영한다. 이미 적용된 마이그레이션 파일은 고치지 않고 새 마이그레이션을 추가한다.

### 0001 마이그레이션(기록 제목 `title`) 적용과 롤백

`0001_graceful_wilson_fisk.sql`은 `records`에 `title text NOT NULL` 컬럼과 `records_title_check` 제약(앞뒤 공백 제거 후 비어 있지 않고 50자 이하)을 추가한다. DEFAULT가 없으므로 **기록이 1건이라도 있는 DB에서는 적용이 실패**한다. 적용 전에 기록 수를 확인한다.

```sh
cd backend
docker exec money-keeper-postgres psql -U money_keeper -d money_keeper -c 'SELECT count(*) FROM records'
```

롤백은 자동화돼 있지 않으며 아래 순서로 수동 실행한다. 컬럼을 삭제하면 저장된 제목은 복구할 수 없으므로 필요하면 먼저 `pg_dump`로 백업한다.

1. backend·frontend를 0001 이전 버전으로 함께 되돌린다. 제목을 요구하는 API·화면이 남아 있으면 안 된다.
2. 컬럼을 삭제한다. 컬럼의 CHECK 제약도 함께 삭제된다.

   ```sh
   docker exec money-keeper-postgres psql -U money_keeper -d money_keeper -c 'ALTER TABLE records DROP COLUMN title'
   ```

3. Drizzle 적용 이력에서 0001 행을 지운다. 지우지 않으면 나중에 0001을 다시 적용할 때 이미 적용된 것으로 보고 건너뛴다. `created_at` 값은 `backend/drizzle/meta/_journal.json`의 0001 항목 `when` 값이다.

   ```sh
   docker exec money-keeper-postgres psql -U money_keeper -d money_keeper -c 'DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1792074759874'
   ```

4. 테스트 DB(`money_keeper_test`)도 같은 방식으로 되돌린다. 이전 버전 코드로 `npm test`를 실행하기 전에 2·3단계를 `-d money_keeper_test`로 실행한다.

## 주의

- `NEXT_PUBLIC_API_BASE_URL`은 Next.js **빌드 시점에 번들에 고정**된다. 배포 환경마다 해당 값으로 frontend를 다시 빌드해야 한다.
- `.env.example`만 커밋한다.
- `backend/docker-compose.yml`의 DB 계정·비밀번호는 로컬 개발 전용이다.

## [금지사항]

- 금지사항을 위반한 소스는 반드시 수정하고 재검증한다. 위반 상태의 구현과 금지 예시는 실제 소스 및 최종 반영 대상에 포함하지 않는다.
- `.env`, `.env.local` 파일을 커밋하지 않는다.
- `drizzle-kit push`로 스키마를 반영하지 않는다.
- 이미 적용된 마이그레이션 SQL(`0000`, `0001` 등)을 수정하지 않는다.
- 기록이 있는 DB에 0001을 적용하려고 `title`에 DEFAULT를 추가하거나 0001 SQL을 고치지 않는다.
- 앱을 이전 버전으로 되돌리지 않은 채 `title` 컬럼만 삭제하지 않는다. 0001 롤백 시 `drizzle.__drizzle_migrations`의 0001 행 삭제를 빠뜨리지 않는다.
- `docker-compose.yml`의 로컬 DB 계정·비밀번호를 배포 환경에 재사용하지 않는다.
- 테스트 DB 대신 개발 DB를 `TEST_DATABASE_URL`로 지정하지 않는다. 테스트는 각 테스트 전에 테이블을 비운다.
