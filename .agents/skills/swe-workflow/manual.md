# Manual mode — you dispatch the reviewers yourself

Use when your harness **can** spawn a child task/agent, but has **no registry entry** for
`explore-code`, `research`, `judge-plan`, `judge-pr`. Read `SKILL.md` first: its phases are the
contract. This file only replaces the dispatch step.

Typical runtimes: pi / DeepAI Code (no `.pi/agents` by design), Codex without a
`.codex/agents/*.toml` projection, DSH without the `dsh-subagents` plugin, or any registry that
failed to load. Everything else in the workflow is unchanged: same gates, same evidence, same
commits.

## Why this works at all

A registered subagent is two things glued together by the harness:

| Piece | Registry mode | Manual mode (this file) |
|---|---|---|
| **System prompt** | harness injects the agent file's body | **you paste the body verbatim** into the child's prompt |
| **Tool policy** | harness applies `tools` / `disallowedTools` | **you state it in the brief** — nothing enforces it |
| **Task brief** | you pass a task | you pass the same brief, appended after the body |

So the rule is one sentence: **the child gets the agent file's body, then the brief — never the
brief alone** (a child that only gets the brief is an unconstrained assistant wearing a job
title), and **never a second copy of the body in this skill** (it would drift from
`agents/*.md`).

### Harnesses with a single prompt field

Some delegation tools take one string and no `system` role (DeepAI Code's `delegate_task` is one).
There the body goes **first** in that field, then a `---` separator, then the brief. It is delivered
as task text, not as a system message, so add the instruction line below and keep the brief short:
the child will weigh the body and the brief as one prompt, and a long brief can drown the body.

## Build the child prompt

For agent `A`, read `.agents/skills/swe-workflow/agents/<A>.md` (or the installed skill path) and
concatenate, in this order:

1. The **markdown body** of the file, frontmatter stripped. Do not rewrite it, do not summarise
   it, do not add persona words.
2. The **installation root** so its `references/*.md` paths resolve:
   `Workflow installation root: <absolute path to the skill dir>`.
3. The **brief** for this dispatch (see below).
4. The **output contract** — the final line only.

Add this line before the body when the agent's frontmatter denies `Edit`/`Write`:

```text
YOU HAVE NO WRITE PERMISSION. Never create, edit, or delete files, never run git, never delegate further. Report findings only.
```

## Brief contract (every dispatch)

```text
TASK: <one sentence>
READ ONLY: <exact files/dirs it may open>
WRITE: none
FORBIDDEN: <adjacent dossiers, other branches, git, submission>
EVIDENCE: <inline text — or the paths from READ ONLY you actually need>
OUTPUT: <cap>. END exactly with <required final line>
```

Two non-negotiables, because nothing sandboxes the child:

- **Inline the evidence instead of pointing at the tree.** Judges need a plan, a diff, test
  output and policy files. Paste them into the prompt and the child needs zero write tools.
  Falling back to "read the repo yourself" is how a manual judge ends up `git commit`-ing.
- **Read only the final line.** Plan verdict is one JSON object; PR verdict is one JSON object;
  exploration returns the file/symbol list. Never paste the child's transcript into your context
  — that is the token cost the shield exists to avoid.

## Per-agent dispatch

| Agent | Send | Read back | Cap |
|---|---|---|---|
| `explore-code` | body + "map callers/callees and affected symbols for: `<task>`" + READ ONLY = repo | file + symbol list | 20 lines |
| `research` | body + local versions from `package.json`/lockfile + the question | cited answer, max 5 links | 25 lines |
| `judge-plan` | body + `references/plan-rubric.md` path + plan text + F2P red-test output + policy paths | 1 JSON object with the 4 criteria | 1 turn |
| `judge-pr` | body + `references/pr-rubric.md` path + `git diff` + test evidence + PR draft + policy paths | 1 JSON object with the 4 criteria | 1 turn |

`explore-code` and `research` are **optional** in this mode. Narrow tasks skip them (Phase 1 in
`SKILL.md` says the same) — a manually dispatched explorer is the most expensive way to read two
files.

## Per-harness invocation

| Runtime | How to spawn | Read-only lever |
|---|---|---|
| Claude Code | `Task` tool, generic agent; paste the body into the prompt | parent tool restrictions only |
| Cursor | its task/subagent launch; use `readonly: true` only when you have a `.cursor/agents` entry | ask for no writes in the brief |
| OpenCode | `task` tool with a generic agent | `permission: {edit: deny}` only for a registered agent |
| Codex | subagents / `/subagents`; custom agents need a `.codex/agents/*.toml` file | none by default — brief only |
| DSH | `agent_<name>` tool **only if** the role exists in `~/.dsh/agents/`; otherwise generic spawn | brief only |
| **DeepAI Code (pi)** | prefer the native `subagent` tool when the session exposes it; otherwise call `orchestrator_capabilities` and, if `canRunChildTask` is true, call `delegate_task` with `role: "review"` and `runtimeMode: "approval-required"`. Cross-provider is supported: run the judge on `claudeAgent` while the lead runs `deepai` | `approval-required` blocks silent edits; a different provider gives real independence |
| anything else | whatever spawns a child turn | state it; if none, use `inline.md` |

DeepAI Code note: there is no `~/.pi/agents` registry to read, and `delegate_task` takes one `task`
string with no `system` field — so the body **must** be embedded (see *Single prompt field* above).
Subagents are a first-class capability there (`appOwnedSubagents: true`, `canRunChildTask: true` per
provider); the absence of a registry is a skill-registration gap, not a capability gap.

## Independence is weaker here — record it

In registry mode the judge is a fresh context with enforced tools. In manual mode it is a fresh
context with advertised rules. So:

- Prefer a **different model or a cheaper model** than the lead engineer for judges when the
  runtime lets you choose; if you must reuse the same one, say so in the evidence report.
- Never "fix" a rejection by re-prompting the same child with the answer you wanted. A second
  round gets the findings, not the verdict.
- Write `mode=manual` in `.workflow/evidence.md` next to the judge verdicts.

## Escalation ladder

```text
registry (enforced tools)
  └─ no registry but child tasks exist → manual (advertised rules)   ← this file
       └─ no child tasks at all        → inline (no independent judge) → inline.md
```

Dropping a level is a documented downgrade, not a failure — but it must be visible in the
evidence report. Never silently skip the gate.
