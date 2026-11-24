# Pre-push gate: template placeholders and the gate's own source

## Verified cause

`universal-pre-push.sh` scanned every tracked file for token-shaped strings, so a documented placeholder in a
committed template (`worker/.dev.vars.example` carrying a dummy `OPENROUTER_API_KEY`) matched the
`sk-[a-zA-Z0-9_-]{20,}` pattern and blocked every push. The only way through was `GIT_SWE_SKIP=1`, which exits
before the test gate as well, so the workaround silently disabled the protection it was meant to enforce.

The first repair — adding `:!*.example` style pathspecs — reintroduced the same failure from the other side: the
explanatory comment contained a literal placeholder key, and the hook is a tracked file in the repo that ships
it, so the gate matched its own source and blocked the push again.

## Repair boundary

Template paths are excluded from the secret scan only: `*.example`, `*.example.*`, `*.sample`, `*.sample.*`,
`*.template`, `*.tmpl`, `*.tpl`. Real keys in tracked source still block, and the merge-conflict gate is
unchanged (a conflict inside a template is still a conflict). Nothing else about the bypass semantics changed:
`GIT_SWE_SKIP=1` remains an explicit, loud emergency escape hatch.

Rules that follow from this:

- A template file is documentation; excluding it is a statement about the file's role, not a weakening of the
  detector for code.
- The hook scans its own source. Comments in `universal-pre-push.sh` must never contain token-shaped text, and
  any change to the pattern must be re-run against the hook file itself.

## Verification

`tests/swe-pre-push-hook.test.ts` builds throwaway git repos and runs the hook directly:

- placeholder keys in `.dev.vars.example`, `config.example.yml`, `.env.sample` and `secrets.template` pass;
- a copy of the hook source itself passes, guarding the self-match regression;
- a real key in `src/config.ts` still exits 1 with `BLOCKED: High-entropy secret`.

Observed before/after on a fixture with the placeholder file: old hook `exit=1`, fixed hook `exit=0`. A real
push through the gate ran `bun test` and the scan cleanly. Both the canonical `swe-workflow` repo and the
workspace skill copy were updated and the hook reinstalled in the workspace and in Kites.
