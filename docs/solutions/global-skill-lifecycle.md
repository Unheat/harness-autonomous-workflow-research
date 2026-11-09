# Global skill lifecycle adapters

Global skill enable/disable/discovery now share native roots for ZCode, Claude Code,
Cursor, Codex, DSH, shared Agents, and OpenCode (respecting XDG_CONFIG_HOME).
Explicit enable clears matching ZCode `skills[path].enable` overrides, preserving
unrelated settings. ZCode-only overrides do not disable other harnesses in inventory.

Safety: dot/traversal names are rejected before filesystem operations. Physical
user skill folders are preserved and reported as requiring explicit migration;
normal toggles manage symlinks only. Catalog deletion honors that refusal. Dangling
workspace links can be explicitly deleted without deleting their missing targets.

Regression command: `bun test tests/global-skill-safety.test.ts`.

## Verification boundary

On 2026-11-09 both agent-reach and harness-protocol resolved to readable catalog
symlinks. The installed ZCode 3.17.2 scanner follows directory symlinks, deduplicates
canonical paths, and accepts both skill manifests. An extracted scanner reproduction
returned both as user-scoped skills for math426 without diagnostics. Further testing
reproduced the reported disappearance using the actual Kites workspace: its project
harness-protocol symlink shared the global canonical file. The desktop scanner visits
workspace roots first and deduplicates canonical paths BEFORE the UI filters scope,
so it returned harness-protocol as workspace-only and the User list omitted it.
Removing only the redundant Kites project symlink via `harness skill remove` changed
the same scanner result from workspace to user scope. CLI/dashboard global promotion
now reconciles an identical project alias in the current workspace, preserving private
physical variants. Other workspaces are not silently modified.

The bundled modern CLI (`glm/zcode.cjs skills list --json`) also discovers the skill;
it is not the same discovery implementation used by the desktop Skills settings.
Actual UI refresh is still the final presentation check. Do not claim full GUI parity
from filesystem unit tests, or change application binaries to force a green result.

The existing DSH MCP projection and global subagent discovery are separate systems;
these skill lifecycle tests do not certify their scope isolation or runtime behavior.
