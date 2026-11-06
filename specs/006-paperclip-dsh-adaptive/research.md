# Verified donor findings

## Paperclip
Decision: pinned `paperclipai@2026.1023.0`; extend using external adapter and native review/worktree facilities. Keep budgets, database and approval model. No second scheduler.
Sources:
- https://github.com/paperclipai/paperclip/blob/master/docs/adapters/external-adapters.md
- https://github.com/paperclipai/paperclip/blob/master/packages/adapter-utils/src/types.ts
- https://github.com/paperclipai/paperclip/blob/master/README.md
Published types/source at the pin, not mutable master documentation, are authoritative during implementation.

## DSH
Installed version: 0.2.2-rc.1. SDK uses independent stdio runtime; native desktop visibility is not implied by persisted session logs. Native UI integration requires same-host session control, likely a Cordis bridge; test last. DSH native MCP mounts are Cordis entries.
Sources: installed DSH runtime package metadata and SDK/session-controller source; https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/006-deployment.md

## Hindsight
Official integration `@vectorize-io/hindsight-paperclip@0.4.2` exists. Backend not detected locally. Plugin uses event-based recall and comment retention; documentation says run-finished is currently a no-op, despite a config-table shorthand implying output retention. Verify actual lifecycle and bank scope.
Source: https://hindsight.vectorize.io/sdks/integrations/paperclip

## Harness²
Upstream supports editable prompt, guardrails, memory, tool guidance, subagents, skills, scripts, plugins. Frozen model weights do not mean only Markdown is changed. Upstream executor defaults are unsuitable for unrestricted production use.
`xisnn/harness2-dsh` transports generated harness trees; it does not optimize or judge them. Native integration is not declared installed or working until a real bounded execution adapter is verified.
Sources: https://github.com/google-research/harness2 and https://github.com/xisnn/harness2-dsh

## Rejected shortcuts
- Migrating Paperclip Postgres to SQLite: unnecessary fork burden.
- Equating test exit != 0 with correct repro: environment errors are not evidence of the target defect.
- Equating a helper library test with live orchestration: requires separate end-to-end proof.
- Disabling Skill in Markdown as universal DSH sandbox: wrong configuration contract and insufficient authorization boundary.
- Automatically generating trust-store grants: bypasses native review and affects unrelated workspaces.
