# Solution: dsh-plannotator Plan Mode Intercept Fix

## Symptom
When the agent executes `exit_plan_mode` while in plan mode, the official Plannotator UI does not open. Instead, DSH falls back to displaying its native inline review card and plan preview tab.

## Root Cause
In DSH 0.1.2-alpha.4+, the session event log was refactored:
`agent.session.events` was removed, and the live log is accessed via `agent.session.snapshotEvents()`.

`dsh-plannotator` (v0.2.0) previously checked:
```javascript
for (const event of agent.session?.events ?? []) {
  if (event.type === 'plan/mode') active = event.data?.active === true
}
```
Because `agent.session.events` was `undefined`, `isPlanModeActive()` always returned `false`. Consequently, `shouldInterceptExitPlanMode()` returned `false`, and `dsh-plannotator` skipped intercepting the tool call, calling `next()` which allowed DSH's native review card to handle it.

A similar issue affected `/plannotator-last` in `lib/commands.js`, where `invocation.agent.session?.events` was passed to `lastAssistantText()`, returning null.

## Resolution
Updated both `lib/plan.js` and `lib/commands.js` to safely resolve session events:
```javascript
const events = typeof agent?.session?.snapshotEvents === 'function'
  ? agent.session.snapshotEvents()
  : (agent?.session?.events ?? [])
```
