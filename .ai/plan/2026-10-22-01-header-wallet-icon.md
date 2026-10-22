---
description: "상단 Wallet 아이콘 + favicon 교체 계획 (승인)"
---

# 상단 Wallet 아이콘 + favicon 교체 (승인)

- 상태: 승인 (2026-10-22, ExitPlanMode)

## Context
상단 `money-keeper`가 텍스트뿐이고 탭 아이콘은 Next 기본 아이콘이다. 가계부 도메인에 맞는 Wallet 아이콘으로 브랜드 표시를 통일한다.
사용자 확정: 아이콘 + 텍스트 / lucide `Wallet` / favicon도 변경 / favicon.ico는 Wallet .ico로 교체 / svg 색은 라이트·다크 자동 전환.

## PM 요약
- 목표: 헤더에 Wallet 아이콘(텍스트 왼쪽), 탭 favicon도 Wallet.
- 범위: `page.tsx` h1 수정, `src/app/icon.svg` 신규, `src/app/favicon.ico` 교체(Wallet).
- 비범위: Header 컴포넌트 분리, metadata title 변경, apple-icon/manifest/OG, 다른 화면 아이콘, docs 수정.
- 산출물: 위 3개 파일 + `.ai/plan/` 사본.

## CTO 검토
- 리스크 낮음 — UI 마크업과 정적 아이콘 파일만 변경. 데이터/API/인증 영향 없음, 신규 의존성 없음(lucide-react 1.57.0에 `Wallet` export 확인).
- Next 16은 favicon.ico와 icon.svg가 공존하면 link 2개를 출력하고 선택은 브라우저 몫. 두 파일 모두 Wallet이라 모양은 일관됨.
- 함정: 파비콘에서 `currentColor` 동작 안 함 → 색 명시. 다크 탭 가시성 → svg에 `prefers-color-scheme` 분기.
- ico는 media query 불가 → 라이트용 진회색(#262626) 고정. 다크 탭 + ico 선택 브라우저에서는 잘 안 보일 수 있음 — 사용자 수용.
- 라이선스: lucide ISC, 재사용 허용. svg에 출처 주석 한 줄.
- 기존 테스트는 h1 텍스트 비의존. 아이콘 `aria-hidden`으로 heading 이름 "money-keeper" 유지.

## PL 작업 경계
- 파일:
  - `frontend/src/app/page.tsx` — `import { Wallet } from "lucide-react"`(month-nav.tsx 패턴), h1에 `flex items-center gap-2`, `<Wallet aria-hidden className="size-5" />` 추가.
  - `frontend/src/app/icon.svg` (신규) — lucide wallet 원본 path 2개, `viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap/linejoin="round"`, stroke `#262626`, `<style>@media (prefers-color-scheme: dark){path{stroke:#fff}}</style>`, 출처 주석. script/외부 참조 없음.
  - `frontend/src/app/favicon.ico` (교체) — 위 svg(stroke #262626 고정판)를 `node_modules/sharp`로 16/32/48 PNG 렌더 → PNG 내장 ICO로 묶음. 변환 스크립트는 scratchpad에만 두고 커밋하지 않음.
- 선행: 승인된 plan을 `.ai/plan/2026-10-22-01-header-wallet-icon.md`(frontmatter description, 상단 상태: 승인)로 저장하고 `.ai/plan/00-index.md` 파일 목록에 항목 추가. 새 plan MD는 03-md-authoring 규칙대로 마지막 섹션 `## [금지사항]`(표준 처리 원칙 문장 포함)을 둔다.
- PA 1개, 병렬 없음. DTO 규칙 해당 없음(신규 함수 없음).

## 검증
1. `cd frontend && npm test` — 기존 테스트 회귀 없음.
2. `npm run lint`, `npm run build` 성공(실행 중 dev 서버 충돌 주의).
3. 실행 중 dev 서버(3000)에서 HTML `<head>`에 `/icon.svg`, `/favicon.ico` link 확인, `/favicon.ico` 응답이 새 ico(크기·헤더 확인).
4. 화면 육안 확인은 사용자 몫(보고에 안내).

## [금지사항]
- 금지사항을 위반한 소스는 반드시 수정하고 재검증한다. 위반 상태의 구현과 금지 예시는 실제 소스 및 최종 반영 대상에 포함하지 않는다.
- Header 컴포넌트 분리, metadata title 변경, apple-icon/manifest/OG 추가, 다른 화면 아이콘 변경, docs 수정 등 비범위 항목을 진행하지 않는다.
- 신규 의존성을 설치하지 않는다. favicon 변환은 이미 설치된 `sharp`만 사용한다.
- `icon.svg`에 `<script>`, 외부 참조(`href`·`url()` 외부 리소스), `currentColor`를 사용하지 않는다.
- favicon 변환 스크립트를 저장소에 추가하거나 커밋하지 않는다.
- Wallet 아이콘에서 `aria-hidden`을 빼거나 h1 텍스트를 바꿔 heading 접근성 이름 "money-keeper"를 변경하지 않는다.
- 실행 중인 dev 서버·BE 서버를 종료하거나 재시작하지 않는다.
