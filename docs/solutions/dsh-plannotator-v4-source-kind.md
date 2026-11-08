# Solution: dsh-plannotator Format V4 Producer-Owned Source Kind Fix

## Symptom
When submitting review feedback or approval notes from Plannotator (`/plannotator-last`, `/plannotator-review`, `/plannotator-annotate`, or Plan Mode approval notes), the turn immediately crashes with:
```text
This turn failed format v4 message requires a producer-owned source kind UNKNOWN
```

## Root Cause
In DeepSeek Harness session format v4, the legacy message source shape `{ kind: 'plugin', plugin: '<name>' }` was retired.
When messages are admitted to a v4 session, DSH validates producer attribution:
```javascript
function source(message) {
  const value = message["source"];
  if (!isSessionFormatJsonObject(value) || typeof value["kind"] !== "string" || value["kind"].length === 0 || value["kind"] === "plugin") {
    throw new SessionFormatError("format v4 message requires a producer-owned source kind");
  }
}
```
Any message whose `source.kind === 'plugin'` is strictly rejected. Under v4 rules, plugins must stamp their producer-owned identity directly into `source.kind`:
`source: { kind: 'plugin:dsh-plannotator', ... }`

In `dsh-plannotator`:
1. `lib/commands.js`: `injectAgentText()` passed `{ kind: 'plugin', plugin: 'plannotator', ... }`.
2. `lib/plan.js`: `injectApprovalNotes()` passed `{ kind: 'plugin', plugin: 'plannotator', ... }`.

## Resolution
Updated both `lib/commands.js` and `lib/plan.js` in `dsh-plannotator`:
```javascript
// Before
source: { kind: 'plugin', plugin: 'plannotator', form: 'notice', summary: 'Plannotator feedback' }

// After
source: { kind: 'plugin:dsh-plannotator', form: 'notice', summary: 'Plannotator feedback' }
```
Bundle was then reloaded via `plugin_manager` (`set_bundle`) so runtime reflects the fix.
