# Skill loadability gate (manager must not claim skills a harness drops)

## Verified cause

A skill can sit in `.agents/skills` as a valid symlink, be counted as active by `harness status`, and still
never reach the model: every harness parses `SKILL.md` frontmatter and silently drops the skill when it does
not conform. pi loads skills through `yaml.parse` on the frontmatter block and returns no skill at all for a
parse error, a missing/empty `description` or a missing `SKILL.md`; only a startup diagnostic records it, and
that diagnostic is invisible in normal use.

A verified instance: `~/.agents/catalog/skills/codebase-memory/SKILL.md` had an unquoted description
`description: Graph queries. Triggers on: explore the codebase, …`. The `: ` inside the plain scalar parses as a
nested mapping, so the file was rejected (`Nested mappings are not allowed in compact mappings`) and the skill
was absent from every pi session in Kites despite a healthy Nov 7 symlink. Quoting the value fixed it.

The second half of the same divergence is lifecycle, and is not a bug: harnesses scan skill locations once per
session. `harness skill add` links the directory immediately, but an already-open thread keeps the skill list it
scanned at startup, so the palette shows nothing until a new session (or app restart) rescans.

## Repair boundary

`inspectSkillLoadability` mirrors the Agent Skills / pi acceptance rules and is the single source of truth for
"will a harness load this": missing `SKILL.md`, unparseable frontmatter and a missing/empty `description` are
hard blockers; malformed `name` and oversized `description` are spec deviations pi tolerates, reported as
warnings so other harnesses' stricter enforcement stays visible. `harness status` annotates a blocked skill with
`⚠️ won't load: <reason>` instead of reporting it linked, `harness doctor` raises it as an error, and
`harness skill add` warns at link time plus reminds the user that each harness needs a new session. The manager
still never edits a third-party `SKILL.md` body to make it parse.

## Verification

`bun test tests/skill-loadability.test.ts` covers valid skills, the unquoted-colon rejection and its quoted
counterpart, missing frontmatter, blank description, missing `SKILL.md`, spec-deviation warnings, CRLF
normalisation and scope resolution order. End to end, a fixture workspace with the broken frontmatter reports
`⚠️ won't load: frontmatter is not valid YAML …` from `harness status` and an `❌ ERROR` from `harness doctor`,
while a valid sibling skill stays clean.
