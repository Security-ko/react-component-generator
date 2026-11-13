import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def main():
    try:
        response = remind(json.load(sys.stdin))
    except Exception:
        # This hook reminds; it does not grant or deny tool permission.
        response = {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "additionalContext": "TDD Reminder: 규칙을 불러오지 못했습니다. AGENTS.md와 대상 경로의 하위 TDD 규칙을 다시 확인한 뒤 구현하세요.",
        }}
    print(json.dumps(response, ensure_ascii=True))


def remind(event, root=ROOT):
    command = event.get("tool_input", {}).get("command", "")
    paths = re.findall(r"^\*\*\* (?:Add File|Update File|Move to):\s*(.+)$", command, re.M)
    if event.get("tool_name") in {"Edit", "Write"}:
        paths.append(event["tool_input"].get("file_path") or event["tool_input"].get("path") or "")
    patch_targets_ts = any(Path(path.strip()).suffix.lower() in {".ts", ".tsx"} for path in paths)
    shell_writes_ts = (
        event.get("tool_name") == "Bash"
        and re.search(r"\.tsx?(?=$|[\s'\"),;])", command, re.I)
        and re.search(
            r">|\b(?:Set-Content|Add-Content|Out-File|New-Item|Tee-Object|"
            r"WriteAllText|WriteAllLines|writeFileSync|writeFile|write_text|write_bytes|"
            r"tee|touch|cp|mv)\b|\.write\s*\(|\bsed\s+-i", command, re.I
        )
    )
    if not patch_targets_ts and not shell_writes_ts:
        return {}
    instructions = (root / "AGENTS.md").read_text(encoding="utf-8")
    section = re.search(r"^##\s+TDD[^\n]*\n.*?(?=^##\s|\Z)", instructions, re.M | re.S)
    rules = section.group(0).strip() if section else "AGENTS.md에서 적용되는 TDD 규칙을 직접 확인하세요."
    return {"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "additionalContext": (
            "TDD Reminder — .ts/.tsx 생성·수정 전 확인\n"
            "대상 경로의 하위 AGENTS.md에 별도 TDD 규칙이 있으면 우선 적용하세요. "
            "이번 변경의 동작이 TDD 필수 대상인지 판단하고, 필수라면 구현 전에 "
            "해당 동작의 테스트를 실행해 의도한 실패를 확인했는지 점검하세요. "
            "미확인 상태라면 구현 작성을 멈추고 RED부터 진행하세요. "
            "타입·설정·순수 UI 등 면제 여부는 아래 규칙의 변경 동작 기준으로 판단하세요.\n\n"
            + rules
        ),
    }}


if __name__ == "__main__":
    main()
