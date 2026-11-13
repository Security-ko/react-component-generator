import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    "remind_tdd", Path(__file__).with_name("remind_tdd.py")
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class RemindTddTests(unittest.TestCase):
    def test_hook_stdin_outputs_advisory_context_without_blocking(self):
        event = {"tool_name": "apply_patch", "tool_input": {
            "command": "*** Begin Patch\n*** Add File: src/new.ts\n+export {};\n*** End Patch"
        }}
        output = io.StringIO()
        with patch("sys.stdin", io.StringIO(json.dumps(event))), patch("sys.stdout", output):
            MODULE.main()
        response = json.loads(output.getvalue())
        self.assertIn("additionalContext", response["hookSpecificOutput"])
        self.assertNotIn("permissionDecision", response["hookSpecificOutput"])

    def test_structured_edit_and_write_paths_remind(self):
        for tool, field in [("Edit", "file_path"), ("Write", "path")]:
            with self.subTest(tool=tool):
                result = MODULE.remind({"tool_name": tool, "tool_input": {field: "src/new.ts"}})
                self.assertIn("hookSpecificOutput", result)

    def test_shell_file_writes_remind_but_reads_and_test_runs_do_not(self):
        for command, expected in [
            ("Set-Content src/App.tsx 'new content'", True),
            ("Get-Content src/App.tsx", False),
            ("bun run test -- src/App.test.tsx", False),
            ("echo content > src/example.ts", True),
            ("python -c \"open('src/example.ts','w').write('content')\"", True),
        ]:
            with self.subTest(command=command):
                result = MODULE.remind({"tool_name": "Bash", "tool_input": {"command": command}})
                self.assertEqual("hookSpecificOutput" in result, expected)

    def test_non_typescript_edits_and_delete_only_patches_do_not_remind(self):
        for command in [
            "*** Begin Patch\n*** Update File: README.md\n@@\n+App.tsx\n*** End Patch",
            "*** Begin Patch\n*** Delete File: src/old.ts\n*** End Patch",
        ]:
            with self.subTest(command=command):
                self.assertEqual(MODULE.remind({"tool_name": "apply_patch", "tool_input": {
                    "command": command
                }}), {})

    def test_typescript_edit_receives_current_tdd_section_as_context(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "AGENTS.md").write_text(
                "# Rules\n## TDD Rule\n먼저 재현 테스트를 실행한다.\n"
                "### Details\n하위 TDD 규칙 우선.\n## Other\n관계없는 내용\n",
                encoding="utf-8",
            )
            result = MODULE.remind({"tool_name": "apply_patch", "tool_input": {
                "command": "*** Begin Patch\n*** Update File: src/App.tsx\n@@\n-old\n+new\n*** End Patch"
            }}, root)
        output = result["hookSpecificOutput"]
        self.assertEqual(output["hookEventName"], "PreToolUse")
        self.assertIn("먼저 재현 테스트를 실행한다.", output["additionalContext"])
        self.assertIn("하위 TDD 규칙 우선.", output["additionalContext"])
        self.assertNotIn("관계없는 내용", output["additionalContext"])
        self.assertNotIn("permissionDecision", output)


if __name__ == "__main__":
    unittest.main()
