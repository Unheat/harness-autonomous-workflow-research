# Implementation Plan: Subagent Portability

**Branch**: `013-subagent-portability` | **Spec**: [spec.md](spec.md)

## Layout

```text
.agent/src/
  subagents.ts                        + splitSubagentDocument (frontmatter vs body)
  services/subagent-projection.ts     Codex TOML projection (build / inspect / sync)
  workspace.ts                        .codex/agents: link removed, projection refreshed
  doctor.ts                           reports missing / stale / blocked projection
.agent/hooks/auto-heal-symlinks.sh    same policy, plus Codex prune
.agents/skills/swe-workflow/
  SKILL.md                            + mode selection router
  manual.md                           prompt-only dispatch contract + per-harness table
  inline.md                           labelled self-audit, two human checkpoints
tests/subagent-projection.test.ts
```

## Key choices

- **Projection, not link.** Codex's dialect is a different language (TOML), so a link feeds it the
  wrong format. Same reasoning the repo already applies to `.pi/mcp.json`.
- **Ownership marker + hand-written preservation.** Repair may only delete what it generated, which
  keeps `Manager = ground truth` intact without destroying a user's own Codex agent.
- **Instruction line instead of `sandbox_mode = "read-only"`.** A judge must run tests; a read-only
  sandbox would silently break `judge-pr` on Codex. The limitation is reported, not faked.
- **Manual mode lives in the skill, not the manager.** It works on every harness today, needs no
  install step, and keeps the manager's job to declaration + projection.

## Verification

- `bun test tests/subagent-projection.test.ts` — TOML shape, idempotency, symlink pruning, orphan
  cleanup, hand-written preservation, `initWorkspace` end-to-end.
- `bun test ./tests/*.test.ts` — no regression (one pre-existing cross-file HOME-leak failure in
  `harness-trust` reproduces on unmodified HEAD).
- `harness heal` on this workspace generates six TOML agents from six canonical Markdown agents.
