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


