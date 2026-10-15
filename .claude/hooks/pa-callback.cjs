// PA completion callback hooks.
//   node pa-callback.cjs subagent-stop  -> SubagentStop (matcher: pa)
//     Blocks the PA from stopping until its report has the reviewer fields,
//     then leaves a flag so the main session must print a callback report.
//   node pa-callback.cjs stop           -> Stop
//     If the flag exists, removes it and blocks (exit 2) with report instructions.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const projectKey = crypto.createHash('sha1').update(path.resolve(projectDir).toLowerCase()).digest('hex').slice(0, 12);
const flagPath = path.join(os.tmpdir(), `claude-pa-callback-${projectKey}`);

const REVIEW_BLOCK_REASON =
  '아직 reviewer 판정이 보고에 없습니다. reviewer를 호출했고 실행 중(백그라운드 시작됨)이면 BLOCKED를 쓰지 말고 판정(PASS/REWORK/BLOCKED)이 올 때까지 기다리세요. 재호출·판정 추측 금지. ' +
  'reviewer를 아직 호출하지 않았다면 지금 호출하고, 지적사항은 수정·검증 후 재검토받으세요. ' +
  '최종 보고에는 REVIEWER_STATUS: PASS, 🔎 Reviewer 검토:, 🔁 추천 및 처리: 항목과 실제 검토·수정 근거가 필요합니다. ' +
  'reviewer 호출 자체가 실패했거나 응답 없이 종료된 경우에만 REVIEWER_STATUS: BLOCKED, 🔎 Reviewer 검토:, 🔁 다음 조치: (PL/메인 세션이 reviewer 호출 중계) 로 실패 보고하세요. ' +
  '검토를 수행하지 않고 PASS를 작성하지 마세요.';

const CALLBACK_INSTRUCTION = [
  '서브에이전트(PA) 작업이 방금 종료되었습니다. 응답을 끝내기 전에 콜백 보고를 먼저 출력하세요.',
  '',
  '- 성공: ✅ 완료 / 📁 변경·생성 파일 / 📝 작업 내용 요약 / 🧪 검증 결과',
  '- Reviewer: 최종 PASS, 검토 기준·범위, 지적 ID별 추천 → PA 수정 → 재검증, PL 수용/보류 결정·이유. 미검토/BLOCKED는 완료로 보고하지 마세요.',
  '- 실패: ❌ 실패 / 💥 실패 이유 / 🔍 에러 분석',
  '  실패는 여기서 끝내지 않는다 — PL이 원인을 검증한 뒤 PA 재작업을 지시하고 성공할 때까지 반복한다.',
  '  기술적 원인이면 🧭 CTO, 설계/범위 문제면 🗂️ PM과 소통한다. 사용자 판단이 필요하면 ❓ 로 질문한다.',
].join('\n');

function onSubagentStop(payload) {
  if (payload.agent_type !== 'pa') return;
  const report = payload.last_assistant_message || '';
  const hasStatus = /^REVIEWER_STATUS: (PASS|BLOCKED)\s*$/m.test(report);
  const hasReview = /^🔎 Reviewer 검토:\s*\S.+$/m.test(report);
  const hasFollowup = /^🔁 (추천 및 처리|다음 조치):\s*\S.+$/m.test(report);
  if (!(hasStatus && hasReview && hasFollowup)) {
    console.log(JSON.stringify({ decision: 'block', reason: REVIEW_BLOCK_REASON }));
    return;
  }
  try {
    fs.writeFileSync(flagPath, String(Date.now()));
  } catch (error) {
    console.error(`pa-callback: failed to write flag ${flagPath}: ${error.message}`);
  }
}

function onStop() {
  if (!fs.existsSync(flagPath)) return;
  try {
    fs.unlinkSync(flagPath);
  } catch (error) {
    console.error(`pa-callback: failed to remove flag ${flagPath}: ${error.message}`);
  }
  console.error(CALLBACK_INSTRUCTION);
  process.exitCode = 2;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(input || '{}');
  } catch (error) {
    console.error(`pa-callback: invalid hook payload: ${error.message}`);
    return;
  }
  if (process.argv[2] === 'subagent-stop') onSubagentStop(payload);
  else if (process.argv[2] === 'stop') onStop();
});
