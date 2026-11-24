# idea 1: everything adaptive
## self adaptive harness 
https://github.com/google-research/harness2

+ optional a helper finetuned toward repo content small llm to help with system thinking
## self adaptive memory 
- reference donor:
  - Hindsight: Strongest candidate for a ready-made, 
  learning-oriented repository memory system. It automatically ingests Git history and coding sessions, maintains project knowledge, and supports reflective retrieval. It even lists ZCode among its integrations. ( recommend )

  - ai-memory: Particularly interesting for self-improvement. It captures coding sessions, builds a versioned knowledge wiki, and can periodically propose and apply evidence-backed corrections to its own stored knowledge.

  - claude-mem: A popular, established option for automatically recording development sessions and retrieving relevant information later, with relatively low context overhead.
## EVAL for adaptive ( can use to improve both self adaptive harness  and self adaptive memory )
 new idea i think of: for adaptive to work we have to build a eval architect that actually work and able to grade so it can be better: one possible is how harness2 grade or we can learn from how quant dev do which is backtest, but instead on pull request, let say we have data of merge PR that meet all the requirement, reviewed by dev and approved, we use these as grouund true, for model we limit it access to this actual PR, just give it the initial issue the the codebase at that checkpoint before that PR, then it will run the pipeline, we will have a judge toward 2 stages or can be more
  - the judge look at code plan see that it obviously fix wrong place or wrong implement compare to actaul PR (of course wrong here is logical wrong not syntax as it can not have exact syntax) -> wrong benchmart stop and return as failed test -> judge retunr the diff and why it is bad
  - the if plan ok agent continue the pipline -> create new backtest PR -> judge revew and compare to ground true, if contain all the requirement write in the issue and plan and correctly fix the bug, follow repo rule ( depend, such as unit test, issue reproduce, defensive handling, PR write template,... etc) and similiar in term of SWE logical (no exact word by word) -> pass test else -> no pass test, judge retunr the diff and why it is bad
  - after get the diff from here we can do teh adaptive workflow to improve
  - can be expensive !
  
# workflow main
autonomout outer -> (memory layer + implement layer) -> autonomout outer
(inlcude all code/task related such as planning, task, coding, searching,.. )

- for memory layer, self adaptive memroy above is one of idea
or the + optional a helper finetuned toward repo content small llm to help with system thinking

- for implement layer ( potential not necessary include all or only these):
  - stages can like compose reference from these donor
    - ECC
    - SPECKIT
    - superpower
  - more specific tools:
    -  like web search during plan for best practice that already been solve/ or industry standard or implement: hound, agent-reach, search2ai, hound,... etc
    - up-to-date doc read: gitMCP



- for autonomous outer layer
  - superagent by deepseek https://github.com/deepseek-ai/dsh-superagent-prototype
  - paperclip https://github.com/paperclipai/paperclip
  - storytold architect
  - OpenMausBot https://github.com/milind-soni/OpenMausBot
    - not an orchestrator engine: it is a **local-first control plane / front-of-house** for a roster of
      coding agents (Claude/Codex/Grok CLI under drivers), one bot = one agent with its own model,
      working folder, skills and memory.
    - the parts worth borrowing for our coordinator:
      - *channels* -> per-project context (transcript + instructions + working folder + bot roster) = a
        natural mapping onto our workspace/worktree lane, without cloning agents.
      - *MCP control plane that is deliberately bounded* — expose inspect/read/send/wait/interrupt but never
        approval grants, credentials or lifecycle. Matches our judge/approval-is-human-only rule.
      - *headless CLI contract* (`openmausbot team apply`, `openmausbot run ... --json`, exit codes) — the
        shape our L0 coordinator needs so a queue/webhook can drive it from scripts and CI.
      - *triggers* (schedule / webhook / app-event) with queue-on-overlap semantics (skip a tick if the
        previous run is still active) — a cheap answer to our "no unbounded autonomous queue" gap.
      - *team-as-Markdown with YAML frontmatter* (portable playbook, connections off, routines paused,
        never carries secrets/chats/permissions) — a good model if we ever want to ship our roster of
        subagents (`swe-workflow` + `judge-plan` + `judge-pr` + explore/research) as one importable unit.
    - what it does NOT give us: dependency/topological ordering across lanes, merge-order reasoning, or
      any notion of a worktree graph — those stay with our L0 design (storytold pattern) and stay
      unproven until we have the backtest eval.

  - **Grok Bot (xAI, closed)** https://x.ai/bot + https://x.ai/bot/guides/grok-bot-for-engineering
    - *not an outer layer for us*: a closed SaaS **fleet manager** ("team of AI bots") built on persistent
      cloud computers and Cursor cloud agents. Each bot has its own folder, skills and memory; bots
      coordinate in group threads and can spawn / monitor / queue / interrupt cloud agents.
    - the parts worth borrowing as product research:
      - *manager bot + specialist bots + ops bot* org pattern (one bot per domain, an ops bot that runs
        onboarding/postmortems) maps onto our L0/L1 roster and a "memory curator" role.
      - *routines / triggers* (nightly audits, P0 polling) with real human hand-off = a good model for our
        trigger adapter, but we keep overlap-skip and a token budget.
      - *proof attached to the PR* (transcript, screenshots, before/after) is the right evidence UX; we
        formalize it as evidence records, not attachments.
    - what it does NOT give us: repository-owned acceptance policy, deterministic planning, merge-order
      reasoning, judge calibration, cross-harness ownership, or portability. Its "auto-merge when review
      confidence is high and blast radius is low" is model judgment — exactly the irreversible step we
      reserve for a human. Do not copy that part.

  - **Google Antigravity 2.0** https://antigravity.google/ (closest shipped thing to our outer layer)
    - *solves the execution choreography, not the governance/correctness layer.* Four modes:
      - `/swarm` https://antigravity.google/docs/swarm — coordinator splits work into named workers per
        file/package, adds a `@verifier` per 2–4 workers and a `@monitor`; each worker gets a public brief
        ("what you own / must not touch / done"); everyone talks on one append-only board with `@mentions`;
        idle members sleep at zero token cost; optional per-worker worktrees; model pinning per member.
      - `/teamwork` https://antigravity.google/docs/teamwork — Phase 1 scoping interview → reviewable prompt
        artifact → human approval; Phase 2 `Sentinel` + `Project Orchestrator` (fresh successor per
        milestone), `Explorers`, `Workers` with **exclusive file ownership**, and `Critic` / `Challenger` /
        `Auditor` / `Success Auditor` gates. Integrity modes `development` / `demo` / `benchmark`.
      - *subagents* — `invoke_subagent` with `inherit` / `branch` (isolated worktree) / `share`, async
        background, clean context, message/interrupt, idle re-awaken.
      - *substrate* — projects (settings/resources/permissions), native git worktrees, scheduled tasks,
        hooks, MCP, headless CLI `agy -p --output-format json|stream-json`, Python SDK.
    - **the actionable hub finding**: Antigravity natively reads `AGENTS.md`, `.agents/skills/`,
      `.agents/agents/`, `.agents/mcp_config.json`, `.agents/hooks.json` — almost our exact layout. Add it
      as a **projection consumer** (agents/mcp/hooks are dialect projections; skills are native), not a new
      custom adapter. Details + exact frontmatter fields in
      `scratch/outer-layer-vs-mausbot-grokbot-antigravity.md` §7.
    - what it does NOT give us: acceptance-as-code (no anchored F2P, no evidence hashes, no staleness),
      provable verifier independence (no non-mutation witness, no held-out cases), deterministic
      merge-order into *our* `main`, immutable constitution/rubrics, judge calibration/backtest, or
      cross-harness ownership. It works in `~/teamwork_projects/{PROJECT}`, not as a merge DAG into the
      real repo.
    - verdict: use it as an execution engine / reference implementation and as a harness in our matrix;
      keep our pinned goal contract + evidence gates as the source of truth. Do not make it the outer layer.

## research snapshot (2026-11-23)

- Full comparison, capability matrix, "what they do better", "what is still missing", recommended outer
  architecture and the Antigravity harness mapping:
  `scratch/outer-layer-vs-mausbot-grokbot-antigravity.md`.
- One-line conclusion: **Antigravity solves the shape, MausBot solves the transport/approval, Grok Bot
  solves the fleet ops — none solves acceptance-as-code, evidence integrity, judge calibration, or
  cross-harness ownership. That intersection is our outer layer.**


