#!/usr/bin/env python3
"""Tests for Git-backed one-shot consumption receipts."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

from tools.branch_hygiene_consumption import (
    TAGGER_EMAIL,
    TAGGER_NAME,
    create_annotated_tag,
)


class AnnotatedTagIdentityTests(unittest.TestCase):
    def test_tag_creation_does_not_depend_on_runner_user_config(self):
        with tempfile.TemporaryDirectory() as temporary:
            repository = Path(temporary)
            empty_config = repository / "empty.gitconfig"
            empty_config.write_text("", encoding="utf-8")
            env = os.environ.copy()
            env.update({
                "GIT_CONFIG_GLOBAL": str(empty_config),
                "GIT_CONFIG_SYSTEM": str(empty_config),
                "GIT_CONFIG_NOSYSTEM": "1",
                "GIT_TERMINAL_PROMPT": "0",
            })
            for key in (
                "GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL",
                "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL",
            ):
                env.pop(key, None)

            subprocess.run(
                ["git", "init", "--quiet", str(repository)],
                check=True, capture_output=True, text=True, env=env,
            )
            subprocess.run(
                [
                    "git", "-c", "user.name=Fixture", "-c",
                    "user.email=fixture@example.invalid",
                    "-C", str(repository), "commit", "--allow-empty",
                    "-m", "fixture",
                ],
                check=True, capture_output=True, text=True, env=env,
            )
            commit_sha = subprocess.run(
                ["git", "-C", str(repository), "rev-parse", "HEAD"],
                check=True, capture_output=True, text=True, env=env,
            ).stdout.strip()

            create_annotated_tag(
                "consumption-marker-test", '{"stage":"reservation"}',
                commit_sha, cwd=str(repository), env=env,
            )
            tag_object = subprocess.run(
                ["git", "-C", str(repository), "cat-file", "-p", "refs/tags/consumption-marker-test"],
                check=True, capture_output=True, text=True, env=env,
            ).stdout
            self.assertIn(
                f"tagger {TAGGER_NAME} <{TAGGER_EMAIL}>",
                tag_object,
            )
            self.assertIn(f"object {commit_sha}", tag_object)


if __name__ == "__main__":
    unittest.main()
