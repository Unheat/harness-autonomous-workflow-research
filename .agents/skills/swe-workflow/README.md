# swe-workflow setup and update guide

This guide covers installing `swe-workflow`, bootstrapping harness subagents/adapters, and keeping it up to date across workspaces.

## What `setup.sh` does

Run from the workspace that contains `.agents/skills/swe-workflow/`:

```bash
bash .agents/skills/swe-workflow/setup.sh
```

It:

1. Verifies required tools (`git`; `rg` optional).
2. Installs canonical subagents into `.agent/agents/`.
3. Scaffolds cross-harness skill/agent adapter symlinks for Claude, ZCode, Cursor, DSH, OpenCode (and Codex skills). Markdown-agent harnesses discover agents through adapter links.
4. Installs the universal pre-push git hook when inside a git repo.

**Codex caveat:** Codex agents are not Markdown-discovered. Codex reads generated `*.toml` under `.codex/agents/`. In a harness-managed workspace, run `harness heal`. Otherwise use swe-workflow manual mode.

Re-run `setup.sh` after every skill update; it is idempotent.

## Install options (self-use)

### Option A: Vercel Skills CLI (recommended for GitHub-hosted skill)

No registry publish/approval needed for self-use; it installs from GitHub.

```bash
# Install into current workspace
npx skills add Unheat/swe-workflow --skill swe-workflow -y

# Bootstrap adapters/subagents
bash .agents/skills/swe-workflow/setup.sh
```

Useful commands:

```bash
npx skills list
npx skills update -y          # update installed skills
npx skills update -y -g       # global skills only
npx skills update -y -p       # project skills only
```

### Option B: Copy/vendor from canonical repo

Good when you want full control or no Skills CLI.

```bash
# from a fresh canonical checkout
git clone https://github.com/Unheat/swe-workflow.git
# or: git -C /path/to/swe-workflow pull

mkdir -p /path/to/target-workspace/.agents/skills
cp -r /path/to/swe-workflow/skills/swe-workflow \
      /path/to/target-workspace/.agents/skills/

cd /path/to/target-workspace
bash .agents/skills/swe-workflow/setup.sh
```

### Option C: Local symlink (single machine, fast iteration)

Use when many local workspaces should track one local checkout.

```bash
mkdir -p /path/to/target-workspace/.agents/skills
ln -s /path/to/swe-workflow/skills/swe-workflow \
      /path/to/target-workspace/.agents/skills/swe-workflow
cd /path/to/target-workspace
bash .agents/skills/swe-workflow/setup.sh
```

Tradeoff: brittle across machines/CI; changes are live immediately.

### Option D: Harness catalog link (recommended on this machine)

The harness manager owns the machine catalog; the workspace gets a symlink instead of a copy.
Point the catalog entry at your local clone once, then link any workspace:

```bash
ln -sfn /path/to/swe-workflow/skills/swe-workflow ~/.agents/catalog/skills/swe-workflow
ln -sfn /path/to/swe-workflow/skills/judge-plan   ~/.agents/catalog/skills/judge-plan
ln -sfn /path/to/swe-workflow/skills/judge-pr     ~/.agents/catalog/skills/judge-pr

cd /path/to/target-workspace
harness skill add swe-workflow   # .agents/skills/swe-workflow -> catalog -> your clone
harness skill add judge-plan
harness skill add judge-pr
bash .agents/skills/swe-workflow/setup.sh
```

Result: one editable copy. Edits or `git pull` in the clone are visible in every linked workspace
immediately; no reinstall and no second copy to drift. `harness status` and `harness catalog` show
the links.

### Option E: Git submodule/subtree (version-pinned)

Use when you want reproducible, git-tracked skill versions. More ceremony, but explicit.

## What updates propagate, and what does not

| Change | Reaches other local workspaces | Reaches other machines |
|---|---|---|
| Edit / `git pull` in the clone (catalog or symlink install) | Immediately | No — each machine pulls its own copy |
| `git push` to GitHub | No | No — it is the shared source, not a deployment |
| `setup.sh` re-run | Refreshes agent copies, adapter links, pre-push hook | Only on that machine |

Agents (`.agent/agents/*.md`) and the pre-push hook (`.git/hooks/pre-push`) are **copies**, not links,
so re-run `setup.sh` after pulling a change that touches them. Skill bodies are linked (catalog/symlink
installs) or copied (Skills CLI/vendor installs).

## Recommended self-use workflow

1. **Pick one canonical source.** This suite's canonical source is `Unheat/swe-workflow`; local workspaces should link to one checkout of it, never keep independent copies.
2. **Install via catalog link, Skills CLI, or copy from canonical** (Options A–D above).
3. **Run `setup.sh` after install/update.** This registers subagents and refreshes adapter links.
4. **Verify mode at runtime.** swe-workflow reports `mode=registry|manual|inline`; registry mode means harness-discoverable judges are available.
5. **For Codex-managed workspaces, run `harness heal`** if you need TOML agent projection.

## Quick verification

```bash
# Adapters exist
ls -la .claude/agents .zcode/agents .cursor/agents .dsh/agents .opencode/agents

# Canonical agents installed
ls .agent/agents

# Codex projection (managed workspaces)
ls .codex/agents
```

## Troubleshooting

- **Subagents not discovered:** re-run `setup.sh`. Check that agent adapter paths are symlinks to `../.agent/agents` (or that real dirs contain expected files).
- **Codex not using judges:** ensure `.codex/agents/*.toml` exists via `harness heal`, or accept manual/inline mode.
- **Stale behavior after update:** re-run `setup.sh`; confirm the workspace’s `.agents/skills/swe-workflow/` is the updated copy.
- **Accidental drift:** diff the workspace skill against canonical:

```bash
diff -ruN /path/to/swe-workflow/skills/swe-workflow \
          /path/to/workspace/.agents/skills/swe-workflow
```