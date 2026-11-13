import importlib.util
import io
import json
import pathlib
import subprocess
import unittest
from unittest.mock import Mock, patch


SPEC = importlib.util.spec_from_file_location(
    "protect_commit", pathlib.Path(__file__).with_name("protect_commit.py")
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ProtectCommitTests(unittest.TestCase):
    def test_missing_shell_command_is_denied(self):
        run_tests = Mock()
        result = MODULE.evaluate({"tool_name": "Bash", "tool_input": {}}, run_tests)
        self.assertEqual(result["hookSpecificOutput"]["permissionDecision"], "deny")
        run_tests.assert_not_called()

    def test_failed_suite_reaches_codex_as_a_denial(self):
        event = {"tool_name": "Bash", "tool_input": {"command": 'git commit -m "change"'}}
        output = io.StringIO()
        with patch("sys.stdin", io.StringIO(json.dumps(event))), patch("sys.stdout", output):
            with patch.object(MODULE, "run_tests", return_value=subprocess.CompletedProcess([], 1)):
                MODULE.main()
        self.assertEqual(json.loads(output.getvalue())["hookSpecificOutput"]["permissionDecision"], "deny")

    def test_each_commit_runs_fresh_tests(self):
        run_tests = Mock(side_effect=[subprocess.CompletedProcess([], 0), subprocess.CompletedProcess([], 1)])
        event = {"tool_name": "Bash", "tool_input": {"command": 'git commit -m "change"'}}
        self.assertEqual(MODULE.evaluate(event, run_tests)["hookSpecificOutput"]["permissionDecision"], "allow")
        self.assertEqual(MODULE.evaluate(event, run_tests)["hookSpecificOutput"]["permissionDecision"], "deny")
        self.assertEqual(run_tests.call_count, 2)

    def test_hook_emits_explicit_denial_json_on_stdin_failure(self):
        output = io.StringIO()
        with patch("sys.stdin", io.StringIO("not json")), patch("sys.stdout", output):
            MODULE.main()
        self.assertEqual(json.loads(output.getvalue())["hookSpecificOutput"]["permissionDecision"], "deny")

    def test_runner_executes_complete_project_suite_without_loading_env_files(self):
        with patch.object(MODULE.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)) as run:
            with patch.object(MODULE.shutil, "which", return_value="bun"):
                MODULE.run_tests()
        args, kwargs = run.call_args
        self.assertEqual(args[0], ["bun", "--no-env-file", "run", "test"])
        self.assertEqual(kwargs["cwd"], MODULE.ROOT)
        self.assertLess(kwargs["timeout"], 300)
        self.assertNotIn("shell", kwargs)

    def test_commit_in_a_different_workdir_is_denied(self):
        run_tests = Mock(return_value=subprocess.CompletedProcess([], 0))
        result = MODULE.evaluate({
            "tool_name": "Bash", "cwd": str(pathlib.Path(__file__).anchor),
            "tool_input": {"command": 'git commit -m "change"'},
        }, run_tests)
        self.assertEqual(result["hookSpecificOutput"]["permissionDecision"], "deny")
        run_tests.assert_not_called()

    def test_combined_commands_and_other_repositories_are_denied_before_testing(self):
        for command in [
            'git add src; git commit -m "change"',
            'git commit -m "one" && git commit -m "two"',
            'git -C elsewhere commit -m "change"',
            'git commit-tree HEAD^{tree}',
            'git commit -m "change"\ngit status',
        ]:
            with self.subTest(command=command):
                run_tests = Mock(return_value=subprocess.CompletedProcess([], 0))
                result = MODULE.evaluate(
                    {"tool_name": "Bash", "tool_input": {"command": command}}, run_tests
                )
                self.assertEqual(result["hookSpecificOutput"]["permissionDecision"], "deny")
                run_tests.assert_not_called()

    def test_test_runner_errors_deny_commit(self):
        for error in [FileNotFoundError("bun"), subprocess.TimeoutExpired("bun", 240)]:
            with self.subTest(error=type(error).__name__):
                run_tests = Mock(side_effect=error)
                result = MODULE.evaluate(
                    {"tool_name": "Bash", "tool_input": {"command": 'git commit -m "change"'}},
                    run_tests,
                )
                self.assertEqual(result["hookSpecificOutput"]["permissionDecision"], "deny")

    def test_successful_suite_allows_commit(self):
        run_tests = Mock(return_value=subprocess.CompletedProcess([], 0))
        result = MODULE.evaluate(
            {"tool_name": "Bash", "tool_input": {"command": 'git commit -m "change"'}},
            run_tests,
        )
        self.assertEqual(result["hookSpecificOutput"]["permissionDecision"], "allow")
        run_tests.assert_called_once()

    def test_non_commit_does_not_run_suite(self):
        run_tests = Mock()
        self.assertEqual(MODULE.evaluate(
            {"tool_name": "Bash", "tool_input": {"command": "git status --short"}},
            run_tests,
        ), {})
        run_tests.assert_not_called()

    def test_failed_suite_denies_commit(self):
        run_tests = Mock(return_value=subprocess.CompletedProcess([], 1))
        result = MODULE.evaluate(
            {"tool_name": "Bash", "tool_input": {"command": 'git commit -m "change"'}},
            run_tests,
        )
        self.assertEqual(result["hookSpecificOutput"]["permissionDecision"], "deny")
        run_tests.assert_called_once()


if __name__ == "__main__":
    unittest.main()
