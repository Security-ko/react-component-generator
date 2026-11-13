import json
import re
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def main():
    try:
        result = evaluate(json.load(sys.stdin), run_tests)
    except Exception:
        # Do not leak tool inputs or test logs. Explicit denial is required:
        # an unhandled hook error can let Codex execute the tool anyway.
        result = decision(False, "Protection Hook: 검증할 수 없는 입력 또는 내부 오류. 실행을 차단합니다.")
    print(json.dumps(result, ensure_ascii=True))


def run_tests():
    bun = shutil.which("bun")
    if not bun:
        candidate = Path.home() / ".bun" / "bin" / "bun.exe"
        if not candidate.is_file():
            raise FileNotFoundError("Bun runtime unavailable")
        bun = str(candidate)
    return subprocess.run(
        [bun, "--no-env-file", "run", "test"], cwd=ROOT,
        timeout=240, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def decision(allowed, reason):
    return {"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow" if allowed else "deny",
        "permissionDecisionReason": reason,
    }}


def evaluate(event, run_tests):
    command = event.get("tool_input", {}).get("command")
    if not isinstance(command, str):
        return decision(False, "Protection Hook: 셸 명령 입력을 확인할 수 없어 실행을 차단합니다.")
    if not re.search(r"\bgit(?:\.exe)?\b[\s\S]*\bcommit(?:-tree)?\b", command, re.I):
        return {}
    if (not re.match(r"^\s*git(?:\.exe)?\s+commit(?:\s|$)", command, re.I)
            or re.search(r"[;&|\r\n`$<>]", command)):
        return decision(False, "Protection Hook: 프로젝트 루트에서 git commit을 단독 명령으로 실행하세요. 명령 결합·다른 저장소 지정은 차단합니다.")
    session_cwd = Path(event.get("cwd", ROOT))
    workdir = Path(event["tool_input"].get("workdir") or event["tool_input"].get("cwd") or session_cwd)
    if not workdir.is_absolute():
        workdir = session_cwd / workdir
    if workdir.resolve() != ROOT:
        return decision(False, "Protection Hook: 테스트 대상과 커밋 대상 일치를 위해 프로젝트 루트에서 실행하세요.")
    try:
        passed = run_tests().returncode == 0
    except Exception:
        return decision(False, "Protection Hook: 테스트 실행 오류 또는 시간 초과. 커밋을 차단합니다.")
    return decision(passed, "Protection Hook: 전체 테스트 통과." if passed else
                    "Protection Hook: 전체 테스트 실패. 커밋을 차단합니다. 실패를 수정한 뒤 다시 시도하세요.")


if __name__ == "__main__":
    main()
