---
description: "등록·저장 버튼 브랜드 파랑을 토큰으로 묶고, 입력 폼 항목 간격·구분선과 버튼 배치를 조정하는 계획입니다."
---

# 브랜드 색 토큰 + 입력 폼 간격·구분선·버튼 배치

상태: 승인

## Context
팝업 입력 폼이 항목끼리 뭉쳐 보이고, 저장 버튼은 검정 기본색이라 등록 버튼(파랑)과 어울리지 않는다. 항목을 간격과 구분선으로 나누고, 저장 버튼을 등록 버튼과 같은 파랑으로 맞추며, 버튼을 양 끝에 둔다.

## PM 요약
- 범위 (사용자 확정)
  1. 브랜드 색 토큰: `frontend/src/app/globals.css` `:root`에 `--brand: #2070EA`, `--brand-hover: #1B64DA`, `@theme inline`에 `--color-brand`, `--color-brand-hover` 등록. 다크 모드 블록에는 두지 않음(현재처럼 라이트·다크 동일).
  2. `frontend/src/components/records/day-panel.tsx` 등록 버튼: `bg-[#2070EA] hover:bg-[#1B64DA]` → `bg-brand hover:bg-brand-hover` (`text-white` 유지).
  3. `frontend/src/components/records/record-form.tsx`
     - 저장 버튼: `bg-brand text-white hover:bg-brand-hover`. 저장 중 비활성·"저장 중…" 유지.
     - 항목 구분: 날짜·구분·수입 종류(조건부)·제목·금액·메모 래퍼에 `border-b pb-4`, form은 `gap-4` 유지 → 선 위아래 16px씩(항목 사이 32px). 메모 아래 선도 둠(버튼 줄과 분리).
     - 라벨-입력 간격: 항목 div `gap-2` → `gap-2.5`, legend `mb-2` → `mb-2.5`.
     - 버튼 줄: 취소 왼쪽 끝, 저장 오른쪽 끝(`justify-between`). `onCancel`이 없으면 저장만 오른쪽 끝.
- 비범위: 취소 버튼 스타일, 검증·문구·필드 순서, aria 속성, `button.tsx`, `ledger.tsx`, 하단 목록, 문서.

## CTO 검토
- 리스크 낮음 — 표시만 변경. 테스트는 role·label로 조회해 클래스·DOM 구조에 의존하지 않음. `docs/02-screens.md`에 폼 레이아웃·버튼 색 규칙 없음.
- 토큰: 색 값이 한 곳에 모여 두 사용처가 공유. `cn`(tailwind-merge)이 `bg-brand`로 `bg-primary`를 덮는지 화면에서 확인 필요.
- 구분선은 래퍼 `border-b` 방식(조건부 수입 종류 fieldset도 자연스럽게 처리, 새 컴포넌트·파일 없음).
- 높이: 약 +100px. Dialog는 `max-h-[90vh] overflow-y-auto`라 잘리지 않음. 375×667에서 수입 폼 스크롤로 저장 버튼 도달 확인.
- 버튼 순서 변경으로 키보드 Tab 순서가 취소 → 저장으로 바뀜(Enter 제출은 그대로).
- 비활성 저장 버튼 흐림은 WCAG 대비 예외.

## PL 작업 경계
- 파일: `globals.css`, `day-panel.tsx`, `record-form.tsx`. PA 1명. 새 파일 없음.
- 순서: 토큰 → 등록 버튼 치환 → 저장 버튼·간격·구분선·버튼 배치 → 검증.

## 검증
1. `cd frontend && npm test`, `npm run lint`, `npm run build`, dev 서버 200.
2. 빌드 CSS에 `bg-brand`·`hover:bg-brand-hover` 규칙 생성 확인.
3. 사용자 육안: 등록·저장 버튼 색·hover 동일, 저장 중 흐림, 항목 구분선, 수입 선택 시 수입 종류 구분선, 버튼 양 끝 배치, 휴대폰 크기 스크롤.

## [금지사항]
- 금지사항을 위반한 소스는 반드시 수정하고 재검증한다. 위반 상태의 구현과 금지 예시는 실제 소스 및 최종 반영 대상에 포함하지 않는다.
- 토큰을 만든 뒤 `#2070EA`·`#1B64DA`를 컴포넌트에 직접 남기지 않는다.
- `button.tsx` variant를 추가·수정하거나 `--primary` 등 기존 테마 토큰을 바꾸지 않는다.
- 취소 버튼 스타일, 폼 검증·필드 순서·aria 속성을 바꾸지 않는다.
- 구분선을 위해 새 컴포넌트·파일을 추가하지 않는다.
- 승인 범위 밖 파일(헤더 아이콘 작업 파일, `backend/`, `docs/`)을 수정하지 않는다.
