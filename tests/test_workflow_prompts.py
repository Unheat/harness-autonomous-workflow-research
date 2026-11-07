"""Prompt wiring checks, not a substitute for real-model judge evals."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / ".agents/skills"


class WorkflowPromptContracts(unittest.TestCase):
    def text(self, relative):
        return (ROOT / relative).read_text()

    def test_main_owns_implementation(self):
        self.assertIn("Write code and tests yourself", self.text(".agents/skills/swe-workflow/SKILL.md"))

    def test_known_location_direct_path(self):
        self.assertIn("Known file/symbol", self.text(".agents/skills/swe-workflow/SKILL.md"))

    def test_explorer_routing(self):
        self.assertIn("cross-file", self.text(".agents/skills/swe-workflow/SKILL.md"))

    def test_research_routing(self):
        self.assertIn("external API", self.text(".agents/skills/swe-workflow/SKILL.md"))

    def test_tester_not_mock_only(self):
        self.assertIn("mock-only", self.text(".agents/skills/swe-workflow/SKILL.md"))

    def test_main_requires_negative_cases(self):
        self.assertIn("failure/recovery", self.text(".agents/skills/swe-workflow/SKILL.md"))

    def test_consumer_policy_not_hardcoded(self):
        self.assertIn("project's `AGENTS.md`", self.text(".agents/skills/swe-workflow/SKILL.md"))

    def test_no_fake_red_for_refactor(self):
        self.assertIn("Refactor", self.text(".agents/skills/f2p-protocol/SKILL.md"))
        self.assertNotIn("all tasks must adhere", self.text(".agents/skills/f2p-protocol/SKILL.md"))

    def test_plan_feature_not_forced_bug_cause(self):
        self.assertIn("feature", self.text(".agents/skills/judge-plan/rubric.md"))
        self.assertIn("characterization", self.text(".agents/skills/judge-plan/rubric.md"))

    def test_pr_semantic_correctness(self):
        self.assertIn("behavior-correctness", self.text(".agents/skills/judge-pr/rubric.md"))

    def test_legitimate_logs_not_blanket_banned(self):
        self.assertIn("legitimate", self.text(".agents/skills/judge-pr/rubric.md"))

    def test_judges_use_canonical_skill(self):
        for name in ("judge-plan", "judge-pr"):
            with self.subTest(name=name):
                prompt = self.text(f".agent/agents/{name}.md")
                self.assertIn(f".agents/skills/{name}/SKILL.md", prompt)
                self.assertNotIn("1-turn", prompt)
                self.assertNotIn("exactly 1 turn", prompt)

    def test_compatibility_worker_is_leaf(self):
        prompt = self.text(".agent/agents/sdd-worker.md")
        self.assertIn("Compatibility", prompt)
        self.assertIn("parent", prompt)
        self.assertNotIn("Call `judge-plan`", prompt)

    def test_development_eval_minimum(self):
        self.assertIn("at least 10 distinct cases per judge", self.text("AGENTS.md"))
        self.assertIn("false accepts and false rejects", self.text("AGENTS.md"))

    def test_owned_prompt_size(self):
        for relative in ("swe-workflow/SKILL.md", "judge-plan/SKILL.md", "judge-pr/SKILL.md"):
            with self.subTest(path=relative):
                self.assertLess(len((SKILLS / relative).read_text().splitlines()), 100)


if __name__ == "__main__":
    unittest.main()
