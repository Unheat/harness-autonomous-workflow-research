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


