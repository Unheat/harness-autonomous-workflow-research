# Plan: Explicit Cross-Harness Project Trust

## Design

`harness trust` is a single user-invoked command. It is deliberately **not** wired into `heal`,
`doctor`, MCP sync, or global toggles: the manager reports gaps, it never approves on a user's behalf.

## Modules

| File | Responsibility |
|---|---|
| `.agent/src/services/harness-trust.ts` | `trustProject()`, `listTrust()`, per-harness grant adapters, Codex TOML upsert |
| `.agent/scripts/cli-commands.ts` | `trust` command dispatch and result printing |
| `.agent/src/cli-printers.ts` | Help entry |
| `tests/harness-trust.test.ts` | Isolated-HOME grant, idempotency, preservation, digest, list |

## Harness adapters (verified on disk)

| Harness | Store | Write |
|---|---|---|
| pi (DeepAI Code) | `<agentDir>/trust.json` | canonical real path → `true` |
| Claude Code | `~/.claude.json` | `projects[path].hasTrustDialogAccepted = true` |
| Codex | `~/.codex/config.toml` | `[projects."<path>"] trust_level = "trusted"` |
| ZCode | `~/.zcode/security/workspace-mcp-trust-v1.json` | one digest record per local MCP declaration |
| Cursor / OpenCode / DSH | — | reported as unsupported, never guessed |

## Safety

- JSON writes preserve every unrelated key and project entry.
- Codex table matching is exact (no prefix bleed into `/repo-extra`).
- Corrupt JSON/TOML fails that harness only and is reported as `failed`.
- Every write is preceded by a read-back comparison, so a second run is a byte-level no-op.
- Trust keys are canonical real paths, matching what the harnesses store themselves.
