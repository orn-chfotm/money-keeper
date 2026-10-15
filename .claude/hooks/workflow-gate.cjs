// UserPromptSubmit hook: injects the approval-gate reminder into every prompt.
// Stdout of a UserPromptSubmit hook with exit 0 is added to Claude's context.
console.log([
  '[워크플로우 게이트]',
  '- 작업 등급을 먼저 판단해 사용자에게 밝힌다: 단순 문서/한 줄 수정 | 구조 변경 없는 작은 코드 수정 | 여러 파일/모듈 | 아키텍처/보안 영향.',
  '- "단순 문서/한 줄 수정"이 아니면 Edit/Write 전에 /workflow 절차를 따른다: read-only 탐색 → pm/cto subagent → EnterPlanMode → 역할별 plan → ExitPlanMode 승인 → pl subagent.',
  '- "요청이 구체적이다/파일 하나다/리스크가 낮다"는 게이트 생략 근거가 아니다. 선언이 아니라 EnterPlanMode 호출로 게이트를 지킨다.',
  '- 한 역할 산출물 후 사용자 확인 없이 다음 역할로 자동 진행하지 않는다.',
].join('\n'));
