---
description: "등록 버튼을 파란색으로, 달력 선택 칸과 오늘 표시를 앰버 계열로 바꾸는 색 조정 계획입니다."
---

# 등록 버튼 파랑 + 선택 칸·오늘 앰버

상태: 승인

## Context
등록 버튼이 검정 기본 버튼이고, 선택 칸은 검은 테두리·링과 회색 배경, 오늘은 회색 링이라 화면이 칙칙하다. 등록 버튼은 금융 도메인에 맞는 파랑으로, 선택·오늘 표시는 파랑이 아닌 따뜻한 앰버로 바꾼다.

## PM 요약
- 목표: 색 세 군데만 바꾼다. 구조·동작은 그대로.
- 범위
  1. `frontend/src/components/records/day-panel.tsx` 날짜 제목 옆 '등록' Button: 배경 `#2070EA`, hover `#1B64DA`, 흰 글자(라이트·다크 동일).
  2. `frontend/src/components/records/calendar-grid.tsx` 선택 칸: 검은 테두리·ring 제거 → `border-amber-500 bg-amber-50`, 다크 `border-amber-400 bg-amber-500/15`, hover `hover:bg-amber-100/60`(다크 `dark:hover:bg-amber-500/20`).
  3. 같은 파일 오늘 숫자: 회색 1px 링 → `ring-1 ring-amber-500`(다크 `ring-amber-400`).
- 후속 조정(사용자 요청, 2026-10-22): 선택 칸 hover를 `amber-100` → `amber-100/60`으로 연하게(빨강 글자 대비 약 4.34 → 4.53:1), 오늘 링을 `ring-2` → `ring-1`로 얇게. 등록 버튼 색은 이후 `2026-10-22-04-form-spacing-brand-color.md`에서 `--brand` 토큰으로 옮김.
- 비범위: 저장 등 다른 버튼, `button.tsx`·`globals.css` 토큰, 토요일·일요일·구분 색, focus-visible 표시, aria 속성, 레이아웃, 문서.
- 문서: `docs/02-screens.md` 27행은 색 이름이 없어("옅은 배경과 강조 테두리 / 약한 링") 수정하지 않는다.

## CTO 검토
- 리스크 낮음 — 표시용 className만 변경. BE·API·데이터·테스트 영향 없음(테스트는 aria·data 속성만 검사).
- 버튼 색 방식: 단일 사용처이므로 Tailwind arbitrary 클래스. `cn`(tailwind-merge)이 `bg-primary`·`text-primary-foreground`를 정상으로 덮는다. 두 번째 사용처가 생기면 `--brand` 토큰으로 올린다.
- 대비(실측): 흰 글자 on `#3182F6` 3.71:1(미달), `#2272EB` 4.49:1(미달), **`#2070EA` 4.60:1(AA 통과, 사용자 선택한 #2272EB와 거의 같은 톤)**, hover `#1B64DA` 5.41:1.
- 앰버 배경(amber-50) 위 주말·구분 글자색은 모두 4.5:1 이상. 선택 테두리는 amber-400보다 눈에 띄는 amber-500 사용.
- 오늘이면서 선택된 칸(첫 화면)은 앰버 숫자 링(1px)으로 선택 테두리와 구분.

## PL 작업 경계
- 파일: 위 두 파일의 className만. 새 파일 없음. PA 1명.
- 재사용: 기존 `Button`, `cn`.
- 순서: day-panel 버튼 → calendar-grid 선택·오늘 클래스 → 검증.
- 커밋은 이전 작업들과 브랜치 분리 방식을 사용자 확인 후 진행.

## 검증
1. `cd frontend && npm test`, `npm run lint`.
2. dev 서버(3000) 응답 200.
3. 사용자 육안 확인: 라이트·다크에서 등록 버튼(hover·focus), 선택 칸, 오늘 칸, 오늘+선택 칸.

## [금지사항]
- 금지사항을 위반한 소스는 반드시 수정하고 재검증한다. 위반 상태의 구현과 금지 예시는 실제 소스 및 최종 반영 대상에 포함하지 않는다.
- 선택 칸·오늘 표시에 파랑을 쓰거나 검은 테두리·ring을 남기지 않는다.
- 흰 글자 대비 4.5:1 미만인 파랑(예: `#3182F6`, `#2272EB`)을 등록 버튼 기본 배경으로 쓰지 않는다.
- 공통 `Button` variant, 테마 토큰, 다른 버튼 색을 바꾸지 않는다.
- focus-visible 표시나 `aria-pressed`·`aria-current`를 제거하지 않는다.
- 승인 범위 밖 파일(헤더 아이콘 작업 파일, `backend/`)을 수정하지 않는다.
