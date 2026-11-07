# Implementation Plan: Unified Control Plane & Global Governance (Spec 007)

**Branch**: `007-unified-control-plane` | **Date**: 2026-11-06

---

## 1. Architectural Architecture Diagram

```
[Web Dashboard (index.html)]          [Interactive CLI Shell (harness.ts)]
            │                                         │
            ▼ (HTTP / JSON)                           ▼ (Commands / TTY)
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│ Web API Controller (server.ts)  │       │     CLI Controller (harness.ts) │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 └───────────────────┬─────────────────────┘
                                     │
                                     ▼
                ┌───────────────────────────────────────────┐
                │        HARNESS CORE DOMAIN SERVICES       │
                │        (.agent/src/services/)             │
                │                                           │
                │  ├── SubagentService (Shield, CRUD)       │
                │  ├── ConfigService (Read/Write/Validate)  │
                │  ├── SkillService (Local, Global, Stash)  │
                │  ├── MCP Lifecycle (Workspace, Global) │
                │  └── DoctorService (Audit & Heal)         │
                └────────────────────┬──────────────────────┘
                                     │
                                     ▼
          Physical Filesystem Adapters & Configuration Backends:
      • Workspace: `.mcp.json`, `.agents/skills`, `.agents/dormant`, `.agent/agents/`
      • Global:  `~/.zcode/cli/config.json`, `~/.claude/`
```

---

## 2. Component Design & Responsibilities

### Phase 1: Domain Service Layer Refactor
- `.agent/src/services/config-service.ts`:
  - `readConfig(target: ConfigTarget): Promise<ConfigReadResult>`
  - `writeConfig(target: ConfigTarget, content: string): Promise<OperationResult>`
  - Supported targets: `workspace-mcp`, `zcode-global`, `claude-settings`, `subagent`.
- `.agent/src/services/subagent-service.ts`:
  - `toggleTokenShield(name: string, scope: 'project' | 'global', enable: boolean): Promise<OperationResult>`
  - `deleteSubagent(name: string, scope: 'project' | 'global'): Promise<OperationResult>`
  - `saveSubagent(name: string, scope: 'project' | 'global', content: string): Promise<OperationResult>`
- Shared MCP domain modules `.agent/src/mcp.ts` and `.agent/src/mcp-global.ts`:
  - Workspace operations: `enableMcp`, `disableMcp`, `removeMcp`.
  - Global operations: `enableGlobalMcp`, `disableGlobalMcp`, `removeGlobalMcp`.
  - Effective scope resolution: `getEffectiveMcpList`; no external gateway configuration access.
- Enhanced `.agent/src/skills-global.ts` & `skills.ts`:
  - Extend `disableGlobalSkill()` to sweep `~/.agents/skills/` (clearing DSH global symlinks).
  - Add `deleteSkillPermanent(workspaceRoot: string, name: string, deleteFromCatalog?: boolean)`.

### Phase 2: Web API Controller & CLI Parity
- `.agent/ui/server.ts`:
  - `/api/subagent/toggle-shield`
  - `/api/subagent/delete`
  - `/api/skill/global-toggle`
  - `/api/skill/delete`
  - `/api/mcp/toggle`, `/api/mcp/global-toggle`, `/api/mcp/delete`
  - `/api/config/read` & `/api/config/write`
  - `/api/doctor`
- `.agent/scripts/harness.ts`:
  - `subagent shield <name> on|off`
  - `subagent delete <name>`
  - `skill delete <name> [--force]`
  - `config read <target>` & `config edit <target>`
  - `mcp on|off|rm <srv>` and `mcp global on|off|rm <srv>`

### Phase 3: Web Dashboard UI Upgrade (`index.html`)
- **Global / Project Scope Toggles**: Clean visual segmented controls for Skills (Project Active vs Global Active).
- **Independent MCP Management**: Workspace / Global controls and effective Active / Dormant / Blocked status. External gateway routing, compression, configuration, and metrics are out of scope.
- **Interactive Subagent Governance**: Clickable badge for Token Shield (`Protected ✅` $\leftrightarrow$ `Shield Off ⚠️`), plus Delete button.
- **Config Editor Modal**: Floating modal with code styling, JSON/YAML validator, syntax error toast, and Save button.
- **Doctor Diagnostic Drawer**: One-click audit with issue listing and instant "Heal Symlinks" button.

### Phase 4: Automated Testing
- Unit tests in `tests/services/` verifying:
  - Subagent token shield injection and removal.
  - Safe config read and validation rejection on corrupt syntax.
  - Workspace/global MCP lifecycle, shadowing, scoped removal, and preservation of unrelated configuration.
  - Global skill unlinking from both ZCode/Claude and `~/.agents/skills/`.
