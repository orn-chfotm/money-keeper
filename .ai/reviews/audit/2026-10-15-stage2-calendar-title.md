---
description: "2단계 보완(달력+title) 작업에서 나온 reviewer 보류 항목과 계획 누락을 기록합니다."
---

# 2단계 보완(달력+title) 리뷰 로그

## Review Log 1 — 제로폭 공백만 있는 제목 허용
- 날짜: 2026-10-15
- 작업: 2단계 보완 — 월 달력 + 기록 제목(title), PA-1 backend
- 작성 역할: reviewer(R1) 지적, 메인 세션 기록
- 심각도: improvement
- 분류: 입력 검증
- 위치: backend/src/routes/records.ts (title Zod), backend/drizzle/0001_graceful_wilson_fisk.sql (records_title_check)
- 내용: U+200B 같은 제로폭 문자만 있는 title이 Zod `trim()`과 DB `btrim()`을 모두 통과한다. 화면에는 빈 제목처럼 보인다.
- 재현 방법: `POST /records`에 `title: "​"`를 보내면 201이 반환된다.
- 영향 범위: 달력 칸·팝업 목록의 제목 표시
- 제안 조치: 보이지 않는 문자(제로폭 문자 등)를 제거한 뒤 길이를 검사할지 정책을 정한다. 정하면 Zod와 DB CHECK를 함께 바꾼다.
- 상태: [-] 보류 (백로그 후보, 정책 결정 필요)
- 사용자 승인 필요 여부: 필요 (검증 정책 변경)

## Review Log 2 — NUL 문자(\u0000) 입력 시 500
- 날짜: 2026-10-15
- 작업: 2단계 보완, PA-1 backend
- 작성 역할: reviewer(R2) 지적, 메인 세션 기록
- 심각도: error
- 분류: 오류 처리 / 입력 검증
- 위치: backend/src/routes/records.ts (title, memo 문자열 검증)
- 내용: PostgreSQL text는 NUL 문자를 저장할 수 없다. `\u0000`이 들어간 문자열은 Zod를 통과한 뒤 DB 단계에서 실패해 400이 아니라 500을 반환한다. 이번 변경 전부터 memo에 있던 결함이다.
- 재현 방법: `POST /records`에 `memo: "a\u0000b"`(또는 title)를 보내면 500이 반환된다.
- 영향 범위: 기록 등록·수정 API의 오류 응답 계약
- 제안 조치: Zod 문자열 스키마에서 `\u0000`을 거부하고 400 VALIDATION_ERROR를 반환한다. 테스트도 추가한다.
- 상태: [-] 보류 (백로그 후보, 이번 승인 범위 밖)
- 사용자 승인 필요 여부: 필요 (범위 밖 수정)

## Review Log 3 — 패키지 제거 계획에서 직접 import 누락
- 날짜: 2026-10-15
- 작업: 2단계 보완, PA-2 frontend 계획
- 작성 역할: PL 보고, 메인 세션 기록
- 심각도: improvement
- 분류: 계획 수립 / 범위 산정
- 위치: frontend/src/components/ui/{alert-dialog,button,card,input,label,radio-group}.tsx
- 내용: 계획은 `cn` 패키지 제거 시 `src/lib/utils.ts`만 수정 대상으로 잡았다. 실제로는 shadcn ui 6개 파일이 `import { cn } from "cn"`으로 직접 import하고 있어 PA-2가 BLOCKED됐다. 메인 세션의 계획 대조 단계에서도 놓쳤다.
- 재현 방법: `grep -rn 'from "cn"' frontend/src`
- 영향 범위: FE 작업 지연. 그동안 BE title 필수화로 FE 등록·수정이 400 상태였다.
- 제안 조치: 사용자가 선택지 A(6개 파일의 import 한 줄을 `@/lib/utils`로 변경)를 승인해 범위를 확대했다. 재발 방지를 위해 패키지 제거·교체 계획을 세울 때는 해당 패키지 import를 grep으로 전수 확인하고 결과를 계획에 적는다.
- 상태: [x] 처리 완료 (범위 확대 승인, PA-2 재실행)
- 사용자 승인 필요 여부: 승인 완료 (선택지 A)

## [금지사항]
- 금지사항을 위반한 소스는 반드시 수정하고 재검증한다. 위반 상태의 구현과 금지 예시는 실제 소스 및 최종 반영 대상에 포함하지 않는다.
- 보류 항목(Log 1, 2)을 사용자 승인 없이 처리 완료로 바꾸지 않는다.
- Log 2를 실제 재현 확인 없이 improvement로 낮추지 않는다.
- 패키지 제거·교체 계획에서 import 전수 확인(grep)을 생략하지 않는다.
- 이 기록을 근거로 승인 범위 밖 수정을 시작하지 않는다.
