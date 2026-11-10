# Feature Specification: pi-like Harness Family Support

**Feature Branch**: `009-pi-like-harness-family`  
**Created**: 2026-11-10  
**Status**: Implemented  
**Input**: User description: "add code to support for this pi-like harness so after this code change all harness that pi-like should work with all harness manager automatically with all the edge case handled (the symlink, ... etc)"

---

## Scope

`pi` and every host derived from it (app-bundled pi runtimes, DSH-style forks) do not read the workspace
`.mcp.json` hub. They read `<workspace>/.pi/mcp.json`, honour it only for a trusted project, and validate a
slightly different dialect. This spec makes the manager treat that whole family as a first-class adapter class
alongside DSH, without hardcoding any vendor path and without ever granting harness trust.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Workspace MCP declarations reach pi-like harnesses (Priority: P1)

A developer toggles an MCP server with `harness mcp on <name>` and expects the same server to be available in a
pi-like harness inside that workspace, with dormant servers shown as disabled rather than vanishing.

**Independent Test**: Enable and disable a catalog server in an isolated fixture, then read the generated
`.pi/mcp.json` and assert the entry shape, `enabled: false` on dormant, and that the hub payload is unchanged.

**Acceptance Scenarios**:
1. **Given** a workspace with `.mcp.json`, **When** `mcp on <name>` runs, **Then** `.pi/mcp.json` contains a
   pi-valid stdio or HTTP entry for that server and no `transport`/`disabled` keys.
2. **Given** a server set to dormant, **When** the projection is regenerated, **Then** the entry stays listed
   with `enabled: false` (pi lists disabled servers without connecting them).
3. **Given** a declaration pi would refuse (legacy SSE, invalid URL, bad name, `-`/`_` namespace clash),
   **When** projecting, **Then** that declaration is skipped and reported instead of being written verbatim.

### User Story 2 - Projections never re-enter the hub (Priority: P1)

A harness writing its own config must not mutate the shared hub, and repair must restore the generated artifact.

**Independent Test**: Replace `.pi/mcp.json` with a symlink to `../.mcp.json`, run `inspectPiProjection` and
`reconcileWorkspaceAdapters`, and assert the hub is untouched and the link is pruned while generated physical
files survive.

**Acceptance Scenarios**:
1. **Given** `.pi/mcp.json` is a symlink into the hub, **When** syncing, **Then** no write happens and the state is
   `blocked`.
2. **Given** the same symlink, **When** `harness heal` runs, **Then** the link is pruned and the projection is
   regenerated as a real file.
3. **Given** a generated physical projection, **When** adapters reconcile, **Then** the file is preserved.

### User Story 4 - The manager is the ground truth for both scopes (Priority: P1)

A server toggled in the manager must appear or disappear in every harness without anyone hand-editing a
harness file, and a stale hand-written harness file must converge on the manager's state.

**Independent Test**: Seed an agent directory with a hand-written `mcp.json` containing one stale server, run
`harness mcp sync`, and assert the file equals the manager's active user scope; run it twice and assert the
second run reports no changes.

**Acceptance Scenarios**:
1. **Given** a pi-like agent directory holding extra or stale servers, **When** `harness mcp sync` runs, **Then**
   the file is rewritten to the manager's active user scope.
2. **Given** projections that already match, **When** sync runs again, **Then** it reports no work.
3. **Given** an agent directory that does not exist on this machine, **When** sync runs, **Then** it is not
   created.
4. **Given** a generated user-scope projection, **When** auditing, **Then** it is not reported as an unmigrated
   declaration (only names the manager does not own are).

### User Story 3 - Drift and trust gaps are visible, never auto-approved (Priority: P2)

An editor or a harness can edit the projection by hand, and a pi-like harness silently ignores an untrusted
project in non-interactive runs. Both must surface in `harness doctor` / the Web UI doctor panel.

**Independent Test**: Tamper with a projection, and separately seed a trust store without the workspace, then
assert `auditWorkspace` reports one stale-projection warning and one trust warning; assert heal fixes only drift.

**Acceptance Scenarios**:
1. **Given** a stale or missing projection with servers, **When** auditing, **Then** a warning names the file and
   prescribes `harness heal`.
2. **Given** a discovered agent directory whose trust store lacks the workspace, **When** auditing, **Then** the
   warning names the directory and states that the manager must never grant trust on the harness's behalf.
3. **Given** `harness heal` on a trusted project, **When** it completes, **Then** `trust.json` is unchanged.

## Functional Requirements

- **FR-1**: Resolve the projection path as `<workspace>/.pi/mcp.json` from named config constants.
- **FR-2**: Translate hub declarations into pi's dialect; refuse what pi refuses with a stated reason.
- **FR-3**: Write atomically, and only when content differs (byte-stable serialization for drift detection).
- **FR-4**: Never write when the target is a symlink; prune symlinked projections during repair.
- **FR-5**: Discover agent directories from the stock location plus opt-in relocation registries
  (`PI_CODING_AGENT_DIR`, `PI_LIKE_AGENT_DIRS`) — no vendor path in code.
- **FR-6**: Read trust with pi's nearest-ancestor, real-path semantics; report gaps; never mutate `trust.json`.
- **FR-7**: Extend global MCP centralization discovery to every existing pi-like agent directory.
- **FR-8**: Expose projection state in `harness status` and doctor issues in the Web UI doctor panel.
- **FR-9**: Project the manager's user scope into every existing pi-like agent directory, on global toggles and
  on `harness mcp sync`; never materialise an unused harness.
- **FR-10**: Tool exposure defaults to `direct` for parity with always-injecting harnesses; `deferred`/`codemode`
  is opt-in per server through the hub declaration.
- **FR-11**: Only names the manager does not own count as unmigrated declarations, so a generated projection is
  never destroyed by centralisation.

## Cross-Resource Coverage

Skills: pi discovers `.agents/skills` natively at user scope and from the workspace up to the git root
(project scope, trust-gated), so a skills adapter must be pruned rather than created — the same rule ZCode
already follows. Subagents: pi has no `.pi/agents` concept, so the manager deliberately exposes none; writing
one would look configured but be invisible at runtime. The full matrix lives in
`docs/ARCHITECTURE.md` section 3.2.

## Non-Goals

- Granting or revoking harness trust, or writing `trust.json`.
- Managing pi settings, extensions, sessions, or provider credentials.
- Supporting legacy SSE transport, which pi rejects.

## Verification

- `bun test` green, including `tests/pi-projection.test.ts` (20 cases across dialect, lifecycle, trust, hub integration).
- Live check: `harness doctor` on this repository reports the missing projection and the untrusted discovered
  harness; `harness status` prints the projection line.
