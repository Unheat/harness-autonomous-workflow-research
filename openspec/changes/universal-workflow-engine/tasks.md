# Tasks: Universal Cross-Harness Agentic Workflow Engine

## 1. Foundational Baseline Setup (Completed)

- [x] 1.1 Establish canonical Single Source of Truth in `.agents/skills` and `.agent/agents`, verified by `manage.sh`
- [x] 1.2 Configure universal directory symlinks for `.claude/skills`, `.zcode/skills`, and `.cursor/skills`, verified by `manage.sh`
- [x] 1.3 Implement context pollution defense via tool stripping (`disallowedTools: Skill`) in `.agent/agents/sdd-worker.md`
- [x] 1.4 Install official Vercel `skills` CLI globally and document `-a universal` convention in `AGENTS.md`
- [x] 1.5 Implement 3-layer automated enforcement (OS symlink, `AGENTS.md` policy, `guard-skills.py`, and `auto-heal-symlinks.sh`)

## 2. Outer Autonomous Runner (Next Implementation Stage)

- [ ] 2.1 Design and implement a portable runner script (`.agent/scripts/run-task.sh`) that provisions an isolated worktree and executes a given task/issue unattended
- [ ] 2.2 Add automatic project test baseline detection (supporting npm, cargo, pytest, poetry) before applying code edits
- [ ] 2.3 Integrate pull request preparation that aggregates git diffs and test evidence without conversational chat spam

## 3. Review-Fix Circuit Breaker & Escalation

- [ ] 3.1 Implement a 3-round retry circuit breaker in the SDD review loop to prevent infinite fix churn between worker and reviewer
- [ ] 3.2 Implement a structured escalation gate that pauses execution and prompts the user only when an unresolvable conflict occurs

## 4. Continuous Learning & Solution Compounding

- [ ] 4.1 Define structured solution template under `docs/solutions/` capturing trigger, cause, verified fix, and key files
- [ ] 4.2 Add pre-planning step instructing the coordinator to query `docs/solutions/` before planning new features or debugging

## Workflow follow-up

- In subsequent sessions, agents will read this change proposal to implement Phase 2, Phase 3, and Phase 4.
- Archive the change upon completion of the implementation phases.
