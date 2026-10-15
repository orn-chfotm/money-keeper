---
description: "2단계 보완 계획: 월 달력 화면과 기록 제목(title) 추가 (승인 대기)"
---

# money-keeper 2단계 보완 — 월 달력 화면 + 기록 제목(title)

## Context
- 2단계 기록 CRUD 구현은 끝났다. BE는 reviewer PASS, FE는 R1 결정 대기 상태였다.
- 지금 가계부 화면은 "월 이동 + 날짜별 목록 + 같은 페이지 폼" 구조다.
- 사용자가 원하는 화면은 다르다. **월 달력 그리드**로 보고, 날짜를 누르면 **팝업**에서 상세 목록과 등록·수정·삭제를 처리한다. 달력 칸에는 기록마다 구분·제목·금액이 보여야 하므로 기록에 **제목(title)** 이 필요하다.
- 작업 등급: 여러 파일/모듈 + 스키마 변경(컬럼 추가). 아래 CTO 섹션은 cto subagent 산출물을 요약했다. PM 범위는 사용자 결정으로 확정돼 별도 PM 호출은 생략했다.

## PM 요약 (사용자 확정 사항)

### 기록 데이터
- **제목(title):** 필수, 최대 50자. 메모는 지금처럼 선택 입력이다.

### 달력 화면
- **배치:** 일요일 시작. 앞뒤 달 날짜는 흐리게 숫자만 보이고, 기록 표시와 클릭은 없다.
- **넓은 화면:** 칸마다 기록을 `구분 · 제목(10자 넘으면 …) · 금액` 형식으로 보여준다.
  - 구분 색: 수입 초록, 지출 빨강, 저축 파랑. 색만으로 구분되지 않도록 글자도 함께 쓴다.
  - 한 칸에 3건까지 보여주고, 나머지는 "외 N건"으로 표시한다.
- **좁은 화면:** "수/지/저" 색 표시를 최대 3개까지 보여주고 나머지는 "+N"으로 표시한다. 제목과 금액은 팝업에서 본다.

### 날짜 팝업
- 날짜를 누르면 팝업이 열리고, 그날 기록 목록과 `[등록] [수정] [삭제]` 버튼이 보인다.
- 등록 폼의 날짜는 누른 날짜로 미리 채운다. 날짜는 수정할 수 있다.
- 저장하면 **팝업이 닫힌다.**
- 저장한 날짜가 보고 있는 달과 다르면 달력 위에 "○월에 저장되었습니다"를 안내한다. 달력은 보고 있던 달을 그대로 유지한다.
- 삭제할 때는 확인 창을 띄운다.

### 기존 결정 반영
- 첫 화면은 FE `todayKst()` 기준의 현재 월로 연다(R1 승인).
- 유틸 패키지 `cn`을 제거하고 `clsx` + `tailwind-merge`로 교체한다.
- 테스트용 `@testing-library/user-event`를 추가한다(CTO 추천, 개발 의존성).

### 비범위
- 일별·월 합계(3단계), 반복 등록(5단계)

## CTO 검토 (요약)

### BE
- **마이그레이션:** `0000`은 개발·테스트 DB에 이미 적용됐으므로 고치지 않는다. **`0001`을 추가한다.**
  - `ADD COLUMN title text NOT NULL`. DEFAULT는 두지 않는다. 지금 데이터가 0건이라 바로 적용된다. 데이터가 있는 DB에서는 실패해서 문제가 즉시 드러난다.
  - CHECK `btrim(title) <> '' AND char_length(title) <= 50`
  - 롤백: 수동으로 `DROP COLUMN title`을 실행하고, 앱도 이전 버전으로 함께 되돌린다. README에 적는다.
- **Zod 검증:** `title`은 trim한 뒤 1~50자(코드포인트 기준 `[...s].length`)여야 한다. trim한 값을 저장한다.
- **정렬:** `date DESC, id DESC`를 **`date ASC, id ASC`(등록순)** 로 바꾼다. 칸 안 표시와 팝업 목록 모두 등록순이 된다. 소비하는 쪽은 FE 하나뿐이다.
- **조회 범위:** 해당 월만 조회한다. API는 바꾸지 않는다.

### FE
- **팝업 구조**
  - Dialog 하나 안에서 목록 화면과 폼 화면을 전환한다.
  - 삭제 확인만 AlertDialog로 한 단계 중첩한다.
  - `ui/dialog.tsx`를 shadcn으로 추가한다. `radix-ui`에 이미 포함돼 있어 의존성은 늘지 않는다.
- **반응형:** CSS(`sm` 브레이크포인트)로만 처리한다.
- **접근성:** 날짜 칸은 `aria-label="10월 15일, 기록 5건"`이 붙은 button으로 만든다. 화면 크기마다 바뀌는 표시는 `aria-hidden` 처리한다.
- **합계:** FE에서 계산하지 않는다(통계는 BE 한 곳).

### 리스크
- 낮음~중간. title NOT NULL은 데이터가 있는 DB에서 실패하지만, 실패가 바로 드러나는 형태다.
- title 필수화는 API 계약 변경이다. BE와 FE를 함께 바꿔야 한다.

## PL 작업 경계
기존 금지 사항을 유지한다: `.claude/`, `.ai/`, `.ai-prompts/`, `.idea/` 수정 금지, git commit 금지, 다른 컨테이너 조작 금지.

### PA-1: backend
- `src/db/schema.ts`: title 컬럼과 CHECK, `MAX_TITLE_LENGTH = 50`
- `npm run db:generate`로 `drizzle/0001_*.sql`을 만든다. SQL을 리뷰한 뒤 `db:migrate`로 개발 DB에 적용한다. 테스트 DB에는 globalSetup이 자동 적용한다.
- `src/routes/records.ts`: Zod title, `RecordDto`, `toRecordDto`
- `src/repositories/records-repository.ts`: 정렬 ASC, title 저장
- `test/records.test.ts`: 아래 케이스를 추가한다.
  - title 누락, `""`, 공백만, 51자 → 거부
  - trim한 값이 저장되는지
  - 이모지 50자 → 허용
  - DB CHECK 직접 위반 → 거부
  - 정렬이 `date ASC, id ASC`인지
  - 기존 테스트 입력에 title을 추가한다.

### PA-2: frontend (PA-1과 병렬 진행. API 계약은 위에서 확정)
**패키지**
- `cn`을 제거하고 `clsx`, `tailwind-merge`를 추가한다. `src/lib/utils.ts`를 고친다.
- `@testing-library/user-event`를 추가한다.
- shadcn `dialog`를 추가한다.

**lib**
- `src/lib/records-api.ts`: `title` 타입 추가
- `src/lib/date.ts`: 그리드 계산 순수 함수(UTC 기반, 일요일 시작, 앞뒤 달 채움칸 포함 주 단위 배열) 추가. `todayKst` 주석을 "폼 기본값과 첫 화면 월"로 고친다.
- `labels.ts`: 구분별 색 클래스와 짧은 글자(수/지/저) 추가

**컴포넌트**
- 신규 `calendar-grid.tsx`: 칸 렌더링, 3건 + "외 N건", 넓은/좁은 화면 표시, 제목 10자 말줄임
- 신규 `day-dialog.tsx`: 목록 화면과 폼 화면 전환, 저장 시 팝업 닫기, 삭제는 AlertDialog
- `record-form.tsx`: title 입력 추가(필수, 50자, 코드포인트 기준). 클릭한 날짜를 기본값으로 받는다. Dialog 안에서 이중 테두리가 생기지 않게 Card 래퍼를 정리한다.
- `record-list.tsx`: 하루 목록 전용으로 바꾼다(`groupByDate` 제거). 수정·삭제 버튼과 AlertDialog는 유지한다.
- `ledger.tsx`: 달력 컨테이너로 재작성한다. 월 상태, `useRecords`, 선택 날짜, 팝업 상태, 다른 달 저장 안내를 맡는다. 같은 페이지 폼과 `editing`/`formKey`는 제거한다.
- `month-nav.tsx`, `hooks/use-records.ts`는 재사용한다.

**테스트**
- 그리드 계산 단위 테스트: 2026-02, 2026-10, 일요일에 시작하는 달
- 칸에 3건 + "외 N건", 10자 말줄임, 채움칸은 클릭 불가
- 날짜 클릭 → 팝업 → 등록 시 날짜가 미리 채워지는지 → 저장하면 팝업이 닫히는지
- 수정, 삭제 확인 흐름
- 다른 달 저장 안내
- title 검증

### PL 직접 (문서)
- `docs/01-requirements.md`, `docs/02-screens.md`: 제목 필수, 달력·팝업 화면
- `docs/03-architecture.md`
  - todayKst 문구를 "폼 기본값과 첫 화면 선택 월"로 고친다.
  - 기록에 제목을 추가한다.
  - 목록 정렬 기준을 적는다.
- `docs/05-acceptance-criteria.md`: 제목 검증 항목을 추가한다.
- `README.md`: 0001 마이그레이션 롤백 절차를 적는다.

## 검증
1. **BE:** `npm run typecheck`, `npm test`, `npm run build` 통과. 위 title·정렬 케이스 포함.
2. **BE 마이그레이션:** `npm run db:migrate`로 개발 DB에 0001이 적용되는지. `psql`로 title 컬럼과 CHECK를 확인한다.
3. **FE:** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` 통과.
4. **curl:** title 없는 POST는 400, title이 있으면 201. GET 정렬이 등록순인지 확인한다.
5. **브라우저 확인 (메인 세션이 직접 수행)**
   - 달력이 현재 월로 열리는지
   - 날짜 클릭 → 팝업 → 4종 등록 → 칸에 색·제목·금액 표시
   - 4건 이상이면 "외 N건"
   - 수정과 삭제 확인 창
   - 다른 달 날짜로 저장했을 때 안내
   - 새로고침 후 유지
   - 좁은 화면 표시
   - AlertDialog와 RadioGroup 스타일(shadcn CSS 일부 인라인 리스크)
