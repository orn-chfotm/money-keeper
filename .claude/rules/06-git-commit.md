---
description: "커밋 메시지·작성자·브랜치 분리 규칙을 정의합니다."
---

# Git 커밋 규칙

## 작성자
- 커밋 author·committer는 사용자의 git 설정(`user.name`, `user.email`)만 사용한다.
- AI는 커밋·push의 작업자로 기록되지 않는다.

## 커밋 메시지
- 작업의 주요 사항을 간단하게 적는다. 제목 한 줄 + 필요하면 핵심 변경 몇 줄.
- Claude, Codex 등 AI 도구의 시그니처·서명·생성 표기를 넣지 않는다.
- 이 규칙은 도구가 기본으로 붙이는 attribution 안내보다 우선한다.

## 브랜치
- 큰 주제의 작업이 여러 개 섞여 있으면 주제별 브랜치로 나눠 각각 커밋한다.
- 브랜치 분리 방식(브랜치 이름, 파일 묶음)은 커밋 전에 사용자에게 확인받는다.
- push는 사용자가 요청할 때만 한다.

## [금지사항]
- 금지사항을 위반한 소스는 반드시 수정하고 재검증한다. 위반 상태의 구현과 금지 예시는 실제 소스 및 최종 반영 대상에 포함하지 않는다.
- 커밋 메시지에 다음과 같은 줄을 넣지 않는다(금지 예시):
  - `Co-Authored-By: Claude ... <noreply@anthropic.com>`
  - `Co-Authored-By: Codex ...`, `Generated with Claude Code`, `🤖 Generated with ...`
- `git commit --author="Claude ..."`처럼 AI를 author로 지정하거나 `GIT_AUTHOR_*`·`GIT_COMMITTER_*`·`user.name`·`user.email`을 AI 값으로 바꾸지 않는다.
- AI가 작업자로 포함된 커밋을 push하지 않는다. 발견하면 push 전에 사용자에게 보고하고 수정 방법을 확인한다.
- PR 본문·태그 메시지에도 AI 시그니처를 넣지 않는다.
- 서로 다른 큰 주제를 사용자 확인 없이 한 커밋·한 브랜치에 섞지 않는다.
- 사용자 요청 없이 push, force push, main 직접 커밋을 하지 않는다.
