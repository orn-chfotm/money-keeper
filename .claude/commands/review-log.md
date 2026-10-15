---
description: 리뷰 중 발견한 에러/크리티컬/개선사항 또는 AI 설계·피드백을 .ai/reviews/ 에 기록한다
argument-hint: <기록할 내용 또는 대상>
---

다음 내용을 리뷰 로그로 기록한다.

대상: $ARGUMENTS

## 위치

`.ai/reviews/<category>/YYYY-MM-DD-{slug}.md` (작업 단위면 `<task-id>.md`). `.ai/reviews/README.md`가 있으면 그 규칙을 우선한다.

| category | 용도 |
|---|---|
| `audit` | 코드 오류, error/critical/improvement 리뷰 |
| `feature` | 미구현 기능 갭 분석, 기능 추가 계획 |
| `design` | AI 하네스, agent 구조, 지침 파일, 역할 분리 설계 |
| `feedback` | 사용자가 남긴 AI 응답·작업 방식 피드백 |

## 심각도

- error: 테스트/빌드/명령 실패, 요구사항과 다른 동작
- critical: 보안 취약점, 권한 우회, 데이터 손실, 배포 실패, 운영 장애 가능성
- improvement: 테스트 보강, naming, 문서 명확화, 중복 제거

## 형식

```md
## Review Log
- 날짜:
- 작업:
- 작성 역할:
- 심각도: error | critical | improvement
- 분류:
- 위치:
- 내용:
- 재현 방법:
- 영향 범위:
- 제안 조치:
- 상태: [ ] 미처리 | [x] 처리 완료 | [-] 보류/wontfix
- 사용자 승인 필요 여부:
```

## 절차와 금지

1. 작성할 파일 경로와 내용을 먼저 보여주고 사용자 승인을 받은 뒤 작성한다.
2. 실패한 테스트를 improvement로 낮춰 기록하지 않는다.
3. critical 항목은 사용자 승인 없이 처리 완료로 바꾸지 않는다.
4. 하네스 submodule(`.ai-prompts/`) 내부에는 기록하지 않는다.
