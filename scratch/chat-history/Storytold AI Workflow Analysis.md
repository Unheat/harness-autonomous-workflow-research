**You:**

[https://github.com/storytold/photocraft](https://github.com/storytold/photocraft) these apps from storytold ( not just photocraft but they also have a bunch of like rework app) the point is that i am also use harness for coding, but like most of the time the agent themself as the codebase grow it is not familiar with it, as in it every new seisision it is will be like new intern hand over the architecture book, it can never understand fully like the one who developer it as it is can not be finetune directly into its memory it can only read context as brnad new. so do this storytold company open source their ai workflow as well, as like as i see well the core of replicateapp is cool but i think there is one other thing cooler is that they solver. the AI developer familiar i said above completely, as all the PR, all the test, all the code is maintained by the agent their developer barely do anything, but like for like my app kites, i need constant testing, thinking what choke point of app, whihc app we should port, how the reserch, give hint to the model where the bug could be come from, i mean i still dont write any sinlge line of code but like the point is i need constant feedback, test,... thinking, debugging in high level with the agent, while the agent do more inner, specific like write code, debugging the actuall code, write math,.... but it can not do the outer clear, like feedback or even test i have playwritng for it but itself dont know ok this is by design or a bug if a feature let say borke in high level of understnad like user-end as it is not itslef understand the core purpose of the app and like not only that it is not that good at desgin code structure anyway like OOP, industry standard clean code,.. i need myself dont design all them but i constant need ask it to reserach, note back the rule, audit, even i put those thing in AGENTS.md like reaudit, chooose best clean srtucture but like as i said it does not understand the high level of the app anyway as it is unlike humnan brain i build this and i remember what it is and teh core thing of each but the model only learn it thorugh token, and if the infor not in the window context it never knwo like hand new intern from phd MIT full codebase doc, he can code better,, everything beter in SWE but himeslef not understand the app the purpose of each feature,... as he just join, but human learn and agreagate in few month but model dont,each seission is resert to new intern, so how this guys fix this issue? of course they still have to get involve but like what part, like if a perfect agent like i said if solve all of these i can just write a prompt like create me a app 1: 1 to photoshop reverse, engineer, study how it and make it work for agent" for human they understand and they will loop, develope, loop in month, but for agetn it will only draft a boiderplate and dont it self dont understand that what the feature is need even it understand code better, and coding better, and like the real AGI would like receivet that prompt and like actuall wwrok for whole week, testing different strategy, make team, create workflow,... etc to do so like a CEO tell the purpose and SWE team auto do it while CEO just need to tell the high level idea, but seem like AI have not reach there yet, but so what these guy do as i see these guys are the closest wordaround to this probelm, show me sepcici workflow, or like they dont open srouce?

* * *

**ChatGPT:**

## What I found: Storytold has a surprisingly sophisticated AI development workflow, but it isn't entirely open-source.

After examining Storytold / ArtCraft repositories, including [PhotoCraft](https://github.com/storytold/photocraft?utm_source=chatgpt.com), PdfCraft, GridCraft, and FilmCraft, I found something that directly addresses your problem.

They don't appear to solve the model's lack of persistent understanding by making it remember everything. Instead, they externalize product knowledge, engineering decisions, development progress, and validation into a system that each new agent session can reconstruct and continue.

Crucially, their approach goes well beyond a conventional `AGENTS.md`:

* A documented architecture and mandatory engineering rules.
* A ranked backlog of missing or incomplete product capabilities.
* Explicit comparisons against the reference application.
* Machine-readable quality metrics and acceptance tests.
* Programmatic control of the actual application, including screenshots.
* Development logs that tell the next agent what happened and what remains.
* Rules for parallel agents that prevent conflicting edits.

PhotoCraft's public agent instructions explicitly require these components.

GitHub+1

The limitation: Some sibling repositories reference a private shared standards repository, `craftrules`, and local `plan/` directories excluded from Git. Consequently, I can reconstruct much of their development method, but not claim to know their entire internal orchestration system.

GitHub+2

## 1. Their actual agent development loop

Across several repositories, their instructions describe essentially this process:

Orient

Read project status, architecture, current priorities, and previous progress

Select and plan

Pick a ranked product gap, establish expected behavior, identify dependencies

Implement and test

Write code, add regression tests, obey architectural rules

Verify the real product

Execute application commands, inspect state, capture results, check quality metrics

Record and commit

Update gap trackers, scorecards, development logs, and commit the verified change

Next session reconstructs state from the updated records

This is based on PdfCraft's explicitly named autonomous operation protocol, PhotoCraft's task selection and completion rules, and the equivalent instructions in their other applications. The detailed internal `execution-plan.md` is not publicly accessible, so the diagram is a reconstruction of the disclosed process, not their literal orchestration implementation.

GitHub+2

### The specific files worth studying

|   Public resource   |   What the agent learns   |
| --- | --- |
|   [AGENTS.md](https://github.com/storytold/photocraft/blob/main/AGENTS.md?utm_source=chatgpt.com)   |   Non-negotiable rules, session orientation, task selection, verification and handoff   |
|   [architecture.md](https://github.com/storytold/photocraft/blob/main/docs/architecture.md?utm_source=chatgpt.com)   |   Responsibilities of each subsystem and permitted dependencies   |
|   [gaps.md](https://github.com/storytold/photocraft/blob/main/docs/gaps.md?utm_source=chatgpt.com)   |   What is missing, broken, or unfinished, ranked for future work   |
|   [target-app-parity.md](https://github.com/storytold/photocraft/blob/main/docs/target-app-parity.md?utm_source=chatgpt.com)   |   How close the application actually is to Photoshop, with evidence and remaining work   |
|   [scorecard.md](https://github.com/storytold/photocraft/blob/main/docs/scorecard.md?utm_source=chatgpt.com)   |   Measurable tests, quality budgets, incomplete capabilities and nonfunctional settings   |
|   [development.md](https://github.com/storytold/photocraft/blob/main/docs/development.md?utm_source=chatgpt.com)   |   How agents build, execute, test, and interact with the app   |

The important difference from an ordinary coding agent is that the next task doesn't have to come from the human. The project already contains a prioritized description of what needs improvement and instructions for validating that improvement.

## 2. How autonomous is it really?

Their documentation provides a revealing comparison between feature coverage and actual usability.

PhotoCraft feature breadth

# ~76%

Features that exist, to varying degrees

Ready for real work

# ~45%

Estimated usefulness as a Photoshop replacement

PhotoCraft's own October 10, 2026 assessment—not an independent benchmark or necessarily its current release status.

GitHub: +1

This is directly related to your concern.

They explicitly acknowledged that an earlier estimate of approximately 82% completion was overly optimistic because it largely counted implemented features, not whether those features worked well enough for real users. They subsequently revised their estimate and documented numerous shortcomings in existing features.

GitHub+1

That's essentially the failure mode you described for Kites: an agent implements a feature and considers it finished, but the user-facing behavior may still be substantially wrong.

### How much human involvement remains?

Their own assessment gives us an unusually concrete picture:

* PhotoCraft reports supporting 10–20 concurrent agents and estimates that about 80% of its remaining work can be parallelized.
* They identify tasks requiring humans: product decisions about AI model integration, signing and publishing decisions, real-hardware testing, native-speaker localization review, and checking compatibility in the target application.
* Their public GitHub activity also shows many community contributors submitting PRs. That means the enormous PR count shouldn't be interpreted as proof that a single unattended agent independently designed, built, verified, and maintained everything.
    
    GitHub+1

So their achievement is closer to high-throughput, agent-led engineering with structured oversight, not a fully autonomous software organization where the human only provides the original idea.

## 3. The most important technical trick: agents can test the product, not just its code

PhotoCraft is designed so that UI actions, CLI commands, and MCP tools all access the same underlying command engine.

That means an agent can control a real instance of the application without manually navigating every UI element.

For example, its documented MCP workflow is:

```
1. doc_open(path)
2. command_list(filter="blur")
3. command_run(
     id="filter.blur.gaussianBlur",
     params={"radius": 4}
   )
4. doc_render_preview()
5. doc_save(path)
```

The actual application also exposes `ui_inspect`, `ui_screenshot`, pointer interactions, and menu controls. PhotoCraft has a reference integration suite of ten realistic editing tasks performed through MCP.

GitHub+1

This is more powerful than asking an agent to use Playwright and look at screenshots.

For example, an agent can verify three separate things:

1. Internal correctness: Did the engine apply the Gaussian blur command with the specified parameters?
2. Application correctness: Does the rendered image actually reflect the operation?
3. User workflow correctness: Can the user open an image, apply the filter, save it, and reopen it without losing changes?

They also enforce architectural constraints in code. `cargo xtask layers` prevents prohibited dependencies, while their scorecard generates measurable results from tests and performance budgets. These rules are executable—not merely reminders in an instruction file.

GitHub+2

## 4. The part they haven't open-sourced

|   Component   |   Public status   |
| --- | --- |
|   Application source and architecture   |   Public   |
|   Agent instructions and coding standards   |   Substantially public   |
|   Tests, benchmarks, scorecards, CI   |   Public   |
|   MCP/CLI tools for operating the apps   |   Public   |
|   Detailed execution plans (`plan/`)   |   Local, gitignored   |
|   Development session logs (`log/`)   |   Local, gitignored   |
|   Shared `craftrules` standards   |   Private or otherwise inaccessible to outside contributors   |
|   Complete multi-agent orchestration and session-resumption implementation   |   I couldn't verify a public release   |

PhotoCraft's own `AGENTS.md` explicitly identifies `plan/` and `log/` as local-only. A LightCraft GitHub issue independently documents the problem of outside contributors being unable to access the shared standards or execution plans.

GitHub+1

So there isn't a complete, publicly available Storytold agent workflow that I can point you to and say "install this in ZCode." There is, however, enough public material to reproduce many of its practices.

## 5. How I'd adapt this specifically for Kites

Your situation is actually harder in one significant respect.

Storytold has a reference product. Photoshop, Illustrator, Excel, and Word already define thousands of expected interactions. Agents can systematically work through a parity checklist.

Kites is its own product. There's no existing application that defines exactly how its translation overlay, OCR, inpainting, model selection, and typesetting should interact.

That means you need to make your product intent testable, rather than only improve the agent's memory.

I'd use this structure:

Kites/

AGENTS.md

Entry point: required reading, rules, task loop, verification gates

docs/product/

Product vision, user journeys, expected behavior, failure definitions

docs/architecture/

Pipeline boundaries, design contracts, component ownership, accepted tradeoffs

docs/decisions/

Architecture Decision Records explaining why choices were made and alternatives rejected

docs/gaps.md

Ranked missing features, known user-facing failures, research opportunities

evals/scorecard.yaml

Measured performance, accuracy, reliability and product acceptance thresholds

tests/golden/

Known inputs, expected outputs, browser interactions, visual regression fixtures

docs/handoff.md

Last verified state, current task, blockers, what the next agent should do

This is my proposed adaptation, not Storytold's exact directory structure.

### Example: the agent independently discovers a Kites regression

Suppose Kites successfully detects 15 speech bubbles and produces translations, but one translated bubble overlaps the next bubble.

Your current workflow might be:

You use Kites → notice the overlapping text → explain the bug to the agent → agent researches the typesetter → agent fixes it → you test again.

The workflow I'd aim for:

1. Automated discovery

Run a fixed corpus of manga pages through the full browser extension. Capture original page geometry, OCR regions, resulting text boxes, translated text, and screenshots.

2. Product-level evaluation

Check acceptance rules such as: translated text must remain inside the intended region, text from different bubbles must not overlap, and unrelated page content must stay unchanged.

3. Agent investigation

Automatically file a reproducible failure with the image, expected behavior, actual behavior, intermediate pipeline artifacts, and suspected subsystem. The coding agent diagnoses and prepares a fix.

4. Independent verification

Run the original failing case, regression tests for other bubbles, visual comparisons, and performance benchmarks. A separate reviewer checks architectural consistency.

5. Persistent learning

Update the behavioral contract or design decision if the fix revealed a generalizable rule, then record the new test and the remaining shortcomings for the next session.

This reduces your role from discovering and explaining every bug to resolving genuinely ambiguous product decisions.

The missing technical capability is not necessarily a smarter model. It's reliable instrumentation, test oracles, persistent product contracts, and an orchestrator that keeps the development loop moving across sessions.

## 6. But will that solve the "new MIT intern every session" problem?

Partially. I think there are three different problems hidden inside your analogy.

|   Problem   |   Storytold-style solution   |   Remaining limitation   |
| --- | --- | --- |
|   Agent forgets architecture   |   Architecture documentation, dependency enforcement, decision records   |   Must reconstruct context every session   |
|   Agent forgets product goals   |   Behavioral specifications, parity checklists, ranked gaps   |   Specifications can be incomplete or wrong   |
|   Agent cannot judge whether the product is genuinely good   |   E2E tests, real-app inspection, visual oracles, performance scorecards   |   Unanticipated UX problems and subjective quality can still require humans   |

The third problem is the hardest.

Even perfect memory doesn't guarantee that the agent will notice a fundamental product issue. And an agent that evaluates its own generated code against tests it also invented can easily reinforce the wrong assumption.

Storytold has mitigated that through external reference behavior, real-file test corpora, community bug reports and explicit human decision boundaries. It hasn't eliminated the problem.

For Kites, I'd prioritize product-behavior specifications and an automated evaluation harness ahead of adding another generic long-term memory plugin. You already have a coding harness and existing project documentation; the larger gain is to make the app itself continuously measurable and the results available to each successive agent.

The goal isn't to make every new session remember months of work. It's to ensure that each new session can answer, with evidence:

What is this product supposed to accomplish? What works today? What fails? Which failure matters most? What constraints must remain true? How will I know my change actually improved the product?

Once those questions have durable, machine-checkable answers, ZCode can operate much more like a continuing engineering team rather than an exceptionally capable intern who needs a new briefing every morning.

Bottom line: Storytold has publicly documented a substantial part of a workable agent-led software factory. Their complete internal factory isn't open-source, and their own quality reports show that it still needs human judgment. But the architecture of their workflow is reproducible—and for Kites, that would likely be more valuable than simply giving the agent a larger memory.

* * *

**You:**

but like again how the agent know to test, what feature missing, what to do next? is there like multiple subagent workflow each do 1 task? like 1 agregate feature reverser from PS and populate list, one implement one test,.... then which one create subagent, adjust workflow or this is human task, which are fully agetna dn which are humaninvolve, show me specific

* * *

**ChatGPT:**

The key distinction is that Storytold automates much of the execution loop, but its public repositories do not prove that the entire management loop is autonomous.

I found explicit instructions for agents to choose tasks, test their own work, update priorities, and continue without asking the owner about routine engineering choices. I also found evidence of parallel agents.

What I didn't find is a public implementation showing exactly who launches those agents, who delegates tasks to them, or whether a permanent AI manager independently decides to create new workstreams.

That distinction matters because you're asking for an AI engineering organization, not simply a coding agent with a backlog.

## 1. What actually controls the agents?

The clearest evidence comes from [FilmCraft's autonomous work protocol](https://github.com/storytold/filmcraft/blob/main/docs/agents.md?utm_source=chatgpt.com) and [PhotoCraft's AGENTS.md](https://github.com/storytold/photocraft/blob/main/AGENTS.md?utm_source=chatgpt.com).

Their workflow relies on three layers:

|   Layer   |   Concrete mechanism   |   Purpose   |
| --- | --- | --- |
|   Product planning   |   `plan/STATUS.md`, `plan/execution-plan.md`, `docs/gaps.md`   |   Tell the agent what needs doing   |
|   Agent instructions   |   `AGENTS.md`, `CLAUDE.md`   |   Tell it how to select, implement, verify, and record tasks   |
|   Executable tools   |   `cargo xtask ci`, parity checks, test corpora, UI control, MCP   |   Determine whether changes pass measurable requirements   |

For example, FilmCraft's public instructions explicitly say that an agent should select the next unfinished task, define its acceptance test, implement it, run the quality checks, record the results, commit, and continue to another task. They reserve decisions involving spending, licensing, publishing, personal data, and destructive Git operations for humans.

GitHub+1

Therefore, once someone starts an agent with those instructions, it has enough direction to perform multiple engineering tasks without receiving a new human prompt each time.

But those documents alone do not prove an unattended service that automatically restarts an agent after context expiration or continuously launches subagents.

## 2. How do they discover missing features without a human telling them?

PhotoCraft has four concrete discovery mechanisms. These are not all the same kind of automation.

|   Discovery method   |   Real PhotoCraft example   |   How automated?   |
| --- | --- | --- |
|   Reference-app inventory   |   Compare Photoshop's keyboard shortcut definitions against PhotoCraft's implemented tools   |   Machine-comparable inventory; initial reference collection isn't fully disclosed   |
|   User feedback   |   GitHub issues identify broken brush behavior, PSD imports, UI interactions, etc.   |   Humans report problems; agents can use the reports as tasks   |
|   Automated evaluation   |   PSD test corpus measures which files open and render correctly   |   Automated test identifies failures   |
|   Agent-driven inspection   |   Inspect the running UI, try interactions, compare outputs against references   |   Agent can investigate; quality judgment isn't always deterministic   |

### A real example: discovering a missing Photoshop tool

In [PhotoCraft's gaps.md](https://github.com/storytold/photocraft/blob/main/docs/gaps.md?utm_source=chatgpt.com), G6 explicitly describes comparing its `Tool` enum with entries from Photoshop's `Default Keyboard Shortcuts.kys` file, supplemented by other tools.

So the discovery process is roughly:

Reference inventory

Photoshop tool names and shortcuts

Implementation inventory

PhotoCraft Tool enum and commands

Identify missing or incomplete tools

Add to G6 / scorecard

Record what's missing, evidence, impact, estimated work, and unresolved limitations.

The actual comparison and the documented missing-feature list are public. What isn't established is that a dedicated autonomous "Photoshop researcher subagent" continuously discovers every reference behavior and maintains this inventory.

GitHub+1

They also have a separate [photocraft-corpus](https://github.com/storytold/photocraft-corpus?utm_source=chatgpt.com) repository with scripts that generate reference files using Photoshop and then test PhotoCraft against them. This is closer to a genuine automated reverse-engineering and validation process, though it still depends on having chosen the test cases.

GitHub+1

## 3. Is it a team of specialized subagents?

Parallel agents: yes. A fixed Research → Architect → Coder → Tester hierarchy: not publicly verified.

Here is what I can establish.

|   Responsibility   |   Who actually does it?   |   Evidence   |
| --- | --- | --- |
|   Define overall goal (Photoshop parity)   |   Human/product owner   |   Public project objective   |
|   Create the initial detailed feature catalog   |   Not fully disclosed   |   Local `plan/photoshop/` and comparable reference folders   |
|   Choose an unfinished task   |   Agent is explicitly instructed to do so   |   `AGENTS.md`, `docs/agents.md`   |
|   Make routine technical design decisions   |   Agent   |   Autonomous decision rules   |
|   Implement feature   |   Agent or contributor   |   Public engineering protocol   |
|   Write acceptance and regression tests   |   Agent is explicitly instructed to do so   |   Definition of Done   |
|   Execute tests and investigate failures   |   Agent plus automatic checks   |   `cargo xtask ci`, corpus tests, UI control   |
|   Update roadmap and shortcomings   |   Agent is explicitly instructed to do so   |   Progress documentation rules   |
|   Run multiple agents on different tasks   |   Supported by documented workflow   |   Worktrees, per-agent build directories and ownership rules   |
|   Decide when to spawn new agents   |   Unknown   |   Orchestration implementation isn't public   |
|   Change the overarching agent workflow   |   Unknown   |   Shared standards and execution plans are partly private   |
|   Approve licensing, spending, publishing   |   Human   |   Explicit escalation rules   |

FilmCraft requires separate Git worktrees for concurrent agents. EffectCraft's private `plan/STATUS.md` reportedly tracks running agents and blockers. LightCraft documents merging agent branches sequentially and rerunning CI after each merge. These are strong signs of a coordinated multi-agent operation, but not proof of what process launches or supervises each agent.

GitHub+2

### The missing piece is their private management plane

Their public instructions frequently point to:

```
plan/
  STATUS.md
  execution-plan.md
  architecture.md
  photoshop/
    reference observations
    screenshots
    feature research
```

The public files explain how agents should operate after obtaining a task. Their private planning files appear to handle much of the detailed task coordination.

So we cannot know whether they have:

* One primary Claude session that dynamically spawns workers.
* A human who starts 10–20 independent agent sessions.
* A persistent external orchestrator that schedules and resumes sessions.

Any of those could be compatible with the publicly documented setup.

## 4. A specific end-to-end example of their documented workflow

Suppose PhotoCraft lacks a Photoshop feature, such as a particular Brush Settings control.

1. Discovery: The gap is identified through a feature checklist, comparison with Photoshop, or a user report. Its details appear in `docs/gaps.md` or a related scorecard.
2. Task selection: A running agent reads `plan/STATUS.md`, if available, or chooses a high-priority unclaimed gap from `docs/gaps.md`. It inspects the relevant architectural module and its dependencies.
3. Research: The agent consults reference behavior, documentation, and the implementation. It decides what the new control should do. For undocumented behavior, FilmCraft's instructions explicitly permit choosing conventional editor behavior and recording the decision.
4. Implementation: The agent implements the behavior, registers the necessary commands, and connects the UI. Another agent may be working on a different module concurrently.
5. Testing: The implementing agent writes tests, runs the prescribed checks, starts or renders the app, interacts through its control channel, and inspects screenshots.
6. Handoff: The agent updates the gap tracker, relevant documentation, test evidence, and task status. It commits the change. The documented protocol says to continue with the next task.

Steps 2–6 are explicitly described in their public agent instructions. Step 1 can be automated in several ways, but who initially discovered and cataloged any particular feature is not necessarily visible in the repository.

GitHub+2

Notice something else: there is no requirement that every stage be a different agent. A single running agent can research, implement, test, and update the backlog. Parallel workers appear to be organized around independent tasks or code ownership, rather than necessarily acting as permanent specialist departments.

## 5. What I would build for Kites instead

This next diagram is my proposed architecture, not a claim about Storytold's private setup.

It's much closer to the CEO → engineering organization analogy you described.

You — Product owner

Define product goals, constraints, and approve genuinely ambiguous decisions

Engineering Manager Agent

Runs recurring evaluations, prioritizes work, delegates tasks, monitors results, and proposes workflow improvements

Product / Research

Competitor research, missing features, user journeys

QA / Evaluation

E2E tests, visual regression, performance measurements

Architecture

Module boundaries, API contracts, design review

Implementation

Feature work, bug fixes, refactors

Shared evidence and task database

Product contracts · GitHub issues · Test results · Architecture decisions · Current progress

Manager starts the next iteration

The manager would make decisions such as:

* When tests fail: Spawn a debugger worker with the failing artifacts; require independent QA verification before accepting the fix.
* When tests pass but usability is poor: Have the QA agent generate new product-level evaluations rather than simply declaring success.
* When the backlog runs low: Assign a research agent to investigate gaps, compare competitors, and propose improvements.
* When implementation becomes messy: Assign an architecture audit, then create small refactoring tasks with regression requirements.
* When a decision affects Kites's fundamental purpose: Escalate to you, rather than guessing.

The distinction is that the manager owns the feedback loop. ZCode remains the implementation tool, but isn't expected to spontaneously remember every responsibility during each unrelated coding session.

For genuine continuity, that manager also needs an external runner or scheduler, persistent task state, controlled worker spawning, and a recovery mechanism. `AGENTS.md` alone cannot supply those capabilities.

## 6. So how much closer is Storytold to your ideal?

My assessment based on the public evidence:

|   Capability   |   Storytold   |
| --- | --- |
|   Agent independently implements features   |   Demonstrated workflow   |
|   Agent independently chooses the next documented task   |   Explicitly instructed   |
|   Agent writes and runs tests   |   Explicitly instructed   |
|   Agent discovers failures using reference corpora   |   Supported   |
|   Multiple concurrent agents   |   Explicitly supported   |
|   Agent independently creates a complete competitor feature inventory   |   Not verified   |
|   AI manager automatically creates and assigns new subagents   |   Not verified   |
|   AI manager independently revises its own development process   |   Not verified   |
|   Completely unattended product development over weeks   |   Not established by public evidence   |

The biggest missing answer is who owns the meta-loop. Storytold has made the individual engineering loop unusually systematic, with much of the product knowledge encoded in tests and tracked gaps. But I cannot establish that they have delegated the entire management of that engineering system to AI.

For your goal, I would not merely copy their repo instructions. I would combine their measurable product-development protocol with a persistent orchestrator that explicitly owns task discovery, agent delegation, independent evaluation, prioritization, and handoff.

That's the architectural difference between an agent that can finish whatever task it's given and an agent organization that can independently determine what needs to happen next.

* * *

**You:**

but Photoshop's feature have like some very hidden feature like after click bunch of button, and like feature layer up feature, and definitely > 1milion context then how agent tell ewhich one have not implemented, and as i said the agent is brand new context each time so let say i have subgant scan for missing feature then at like my app have like 80% similiar to ps, then if the agent just scan random it have to wen through all implemented feature to see which they already have then compare back to ps then scan again all feature ps got as well, so in each new seission it alwasy do 2 most expensive dulicate which is scan all finsihed feature from current app and scan code part in PS that previous seission agent already do as they simply reset window anyway??? and even with this as i said it can not stuff all both all feraturea current and al PS revertse code , so after a context overflow it make thing ok may be our app dont have this yet ( the part just get overflow) and it check agian and which after it check again antoher again overflow and the loop keep going

* * *

**ChatGPT:**

Yes. You've identified the fundamental scalability problem, and Storytold's public workflow does not fully solve it. Their agents don't need to remember everything, but something outside the context window must remember exactly what has been explored, what hasn't, what was implemented, and how confident those conclusions are.

And you're correct that a conventional `AGENTS.md`, a few architecture documents, or even a list of missing features is insufficient.

## 1. What Storytold actually does—and where it breaks down

I checked the mechanism behind PhotoCraft's Photoshop feature coverage.

Their command:

Bash

```
cargo xtask parity
```

doesn't independently explore Photoshop. It compares:

* A predefined Photoshop menu catalog in `crates/ui-egui/src/menu_catalog.rs`.
* PhotoCraft's own command registry.

It then generates `docs/parity-checklist.md`.

The current public checklist reports:

Photoshop menu items with live commands

100%

# 631 / 631

Measured menu-to-command coverage, not complete behavioral equivalence.

GitHub: +1

Now consider a hidden behavior:

1. Create a layer mask.
2. Convert a layer into a Smart Object.
3. Add a particular adjustment.
4. Change color mode.
5. Save and reopen the PSD.
6. Reopen the Smart Object and modify its contents.

A command registry can show 100% coverage while this specific interaction is completely broken.

Storytold explicitly acknowledges that distinction. In its October 2026 assessment, it reported roughly 76% feature breadth but only 45% readiness for real work. It also admitted that earlier completion estimates were too optimistic and that users discovered serious bugs despite the tests passing.

GitHub+1

Their additional strategy is to maintain more granular checklists by subsystem: tools, brushes, context menus, file formats, and so on. Their context-menu document even distinguishes verified Photoshop behavior from inferred behavior because Adobe doesn't publish a complete menu catalog.

GitHub+1

But I found no public evidence of a comprehensive, persistent exploration engine that systematically discovers every hidden, state-dependent Photoshop behavior without revisiting previously explored territory.

That means your objection remains valid even after introducing their checklists.

## 2. The solution is not better memory. It's a persistent exploration database.

The important distinction is between storing knowledge and storing exploration progress.

Imagine agents have discovered 100,000 distinct Photoshop behaviors across hundreds of sessions. A new agent should not read those 100,000 descriptions. It should query the database for one unexplored or partially verified area and receive perhaps 20 relevant records.

Persistent exploration database

Every discovered feature, action sequence, prerequisite, observation, implementation mapping, test, and unexplored branch

Discovery Agent A

Explore unvisited Brush Settings states

Discovery Agent B

Explore unvisited Smart Object workflows

Save observations and next exploration frontier

Persist discoveries immediately, including partial results

New agent, fresh context

Fetch only the next assigned frontier, relevant observations, and checkpoint

The new agent does not restart at the Photoshop home screen and rediscover everything that previous agents already explored.

It can recreate the specific Photoshop state using a stored action sequence, then continue from the last unexplored branch.

### Example: a very deeply nested Photoshop feature

Suppose an agent explores this sequence:

```
Photoshop
 └─ Layer
     └─ Smart Object
         └─ Apply Smart Filter
             └─ Gaussian Blur
                 └─ Blending Options
                     ├─ Opacity
                     ├─ Blend Mode
                     └─ Mask interaction
```

Rather than remembering this in context, it stores structured records:

|   Feature ID   |   Discovery state   |   PhotoCraft state   |
| --- | --- | --- |
|   `SO-001`   |   Reference observed   |   Verified   |
|   `SO-001.01`   |   Reference observed   |   Implemented   |
|   `SO-001.01.01`   |   Reference observed   |   Partial   |
|   `SO-001.01.02`   |   Reference observed   |   Missing   |
|   `SO-001.01.03`   |   Reference behavior not yet explored   |   Unknown   |

These are illustrative IDs, not actual Storytold records.

The database also stores the exact steps to reach each state, screenshots, reference versions, and the associated test evidence.

The next session might receive only:

YAML

```
task: explore
target: SO-001.01.03
reference_version: Photoshop 2026
status: unexplored

reproduce:
  - open fixture smart-object.psd
  - select layer 2
  - apply gaussian blur
  - open blending options
  - activate filter mask

known:
  - opacity behavior documented
  - blend mode behavior documented

unknown:
  - mask interaction when layer is hidden
  - behavior after document reload

save:
  - observations
  - screenshots
  - newly discovered child states
  - checkpoint
```

Notice what's different.

The agent doesn't need to know the other 99,999 features. It only needs the knowledge relevant to this exploration task.

More importantly, when the context window fills, it saves the unfinished exploration as a checkpoint—not merely a summary that says "worked on Smart Objects."

A new agent can resume from the exact frontier.

## 3. But how does it avoid rescanning the clone itself?

This is your second major concern, and it requires another independent mechanism: an implementation index tied to actual source code and tests.

Suppose a discovery agent finds that Photoshop supports a particular smart-filter blending option.

It queries:

SQL

```
SELECT *
FROM feature_coverage
WHERE feature_id = 'SO-001.01.02';
```

The database might return:

JSON

```
{
  "feature_id": "SO-001.01.02",
  "reference": "observed",
  "implementation": "partial",
  "source_symbols": [
    "SmartFilter::blending_options",
    "FilterStack::composite"
  ],
  "tests": [
    "test_smart_filter_blending"
  ],
  "last_verified_commit": "abc123",
  "unresolved": [
    "blend mode behavior differs when masked"
  ]
}
```

The agent doesn't independently scan all 100,000 lines of the existing application looking for the feature. It receives its previously established implementation mapping.

And when code changes?

A Git-diff-aware indexer identifies which files and symbols changed, maps them to affected features, and schedules targeted re-verification. Broader regression suites still run because dependencies and behavioral effects aren't always captured by a static symbol map.

The important statuses are separate:

|   Dimension   |   Meaning   |
| --- | --- |
|   Discovered   |   Have we established the reference behavior exists?   |
|   Explored   |   Which preconditions and interaction branches have we examined?   |
|   Implemented   |   Is equivalent behavior present in our code?   |
|   Verified   |   Has a test compared real behavior against a reference?   |
|   Freshness   |   Is that evidence still valid for the current versions?   |

A feature being `implemented` doesn't imply it is `verified`, and being `verified` for one interaction doesn't imply that every combination of settings works.

This is a far more scalable system than having a model periodically rewrite `gaps.md`.

## 4. How does an agent discover features nobody even knows exist?

This is the genuinely difficult remaining issue.

A persistent database prevents duplicate discovery, but doesn't automatically tell the agent where to look for completely unknown behavior.

For that, I'd have a discovery worker explore Photoshop as a state-transition system.

Simplified exploration algorithm

```
while budget_remaining():
    frontier = db.claim_next_unexplored_state()

    if frontier is None:
        break

    restore_or_replay(frontier.reproduction)

    observations = inspect_available_actions()
    transitions = explore_selected_actions(observations)

    db.save_observations(transitions)
    db.enqueue_new_frontiers(transitions)

    # Record partial progress, even if this session ends.
    db.checkpoint(frontier)
```

The database—not the model's conversation—is the authoritative source of what was already explored.

For a large real application, the `claim_next_unexplored_state` function also needs intelligent prioritization. It would favor previously unseen controls, new dialog states, novel output behavior, commonly used workflows, and interactions involving recently discovered features.

But exhaustive exploration is not realistic.

For example, suppose there are just 20 settings with 10 possible values each. Testing every combination would require:

$$10^{20}\text{ combinations}$$

And Photoshop has many more variables: document modes, layer types, masks, transforms, selected objects, history state, hardware capabilities, plug-ins, etc.

A practical exploration system therefore needs state abstraction, equivalence classes, pairwise or higher-order interaction testing, risk-based sampling, and feedback from real usage.

It should distinguish no unexplored states in our current model from all Photoshop behavior has been discovered. Those are very different claims.

No black-box explorer can guarantee that it has discovered every hidden feature in an application with an unknown and enormous state space.

## 5. The exact division between agents and humans in such a system

This is what I would automate in the Kites engineering organization:

|   Responsibility   |   Automation   |
| --- | --- |
|   Maintain the exploration database   |   Deterministic software   |
|   Choose next unexplored state   |   Scheduler, with agent-assisted prioritization   |
|   Inspect reference app and discover new behavior   |   Exploration agents   |
|   Record observations and evidence   |   Agents plus automatic persistence   |
|   Check whether a behavior is already implemented   |   Source index + retrieval + verification agent   |
|   Create missing-feature tasks   |   Planning agent   |
|   Spawn coding and testing agents   |   External orchestrator   |
|   Decide whether tests passed   |   Automated oracles where possible   |
|   Record incomplete tasks on context reset   |   Checkpoint system   |
|   Decide which app features matter commercially   |   Product agent proposes; human approves major direction   |
|   Judge ambiguous UX or subjective output   |   Human when automated evidence is inadequate   |
|   Change the agent organization's own policies   |   Agent may propose and experiment; human approves major changes   |

The system itself has to be persistent even though the agents aren't. A process manager, task queue, and database should outlive every individual model session.

## 6. Is Storytold using this exact architecture?

I can't verify that. And after looking more closely, I would not credit them with having solved this level of autonomous exploration.

Here is the comparison:

|   Mechanism   |   Storytold public evidence   |   Proposed system   |
| --- | --- | --- |
|   Known-feature tracking   |   Yes, multiple parity documents   |   Persistent structured feature index   |
|   Automated code-to-feature comparisons   |   Yes, for specific inventories   |   Broad source-symbol index   |
|   Reference test corpora   |   Yes   |   Versioned behavioral oracles   |
|   Progress across sessions   |   Yes, via docs and development logs   |   Transactional per-task checkpoints   |
|   Incremental exploration of unknown UI states   |   Not verified   |   Persistent exploration frontier   |
|   Automatic invalidation of stale knowledge after code changes   |   Not verified as a general system   |   Git and dependency-aware invalidation   |
|   Autonomous scheduling and dynamic agent creation   |   Not verified   |   Explicit orchestrator   |

For example, PhotoCraft's public instructions tell agents to read `docs/gaps.md` and `docs/scorecard.md`, take a ranked task, and append to `log/devlog.md` after completion. They explicitly acknowledge that sessions can terminate because of context limits.

GitHub+1

That's useful handoff infrastructure, but it's not evidence of the durable, fine-grained exploration frontier you're describing.

In fact, the existence of stale checklist entries and their earlier overoptimistic parity estimates suggests their knowledge tracking has real limitations.

GitHub+1

## 7. The architecture I'd actually recommend for Kites

I would separate three systems rather than ask one agent to handle everything.

Discovery system

Explores Kites and relevant reference applications; stores behaviors, unexplored states, user journeys, and research evidence.

Engineering system

Maps discovered requirements to Kites's implementation, creates tasks, delegates code changes, validates results, and maintains architecture contracts.

Persistent control plane

Database + scheduler + task leases + checkpoints + versioned evidence + Git indexing. This controls the other systems and survives context resets.

For Kites specifically, I would first index its existing user-facing workflows, code ownership, and tests. Then use actual manga translation cases as reference tasks rather than attempting to enumerate every possible feature before starting.

This would let a research agent investigate, say, multi-bubble typesetting across several sessions without asking the implementation agent to reread every OCR model, translator, renderer, and UI component each time.

There is still a one-time cost to establishing the initial index, and there will always be some rediscovery when stored knowledge is incomplete or stale. The objective is to make that work incremental and proportional to what's changed or remains unknown, not proportional to the entire history of the project.

My conclusion: Storytold has built strong infrastructure for agents to execute a large, documented engineering backlog. Your concern goes one level further: you want agents to autonomously construct, extend, and verify their own understanding of an enormous software product over months. That requires a durable exploration and evidence system, not merely session memory or a collection of subagents.

That is the missing layer I'd focus on building.

* * *

**You:**

ok so show full workflow again and specificall which are human give prompt, write directly which are agent, and which are subagetn,.... be really specific so i may learn and apply to my system so that these beutifull workflow like auto disvoer, auto code many app at once with very littel human intervere like them, like this is the true full autonomous not like prompt very feature each time like normally defveloper do

* * *

**ChatGPT:**

# The complete autonomous AI software-development workflow

Your end goal is very specific:

You provide the product vision once. An AI engineering organization then continuously researches, discovers missing features, designs architecture, writes code, tests the actual application, fixes regressions, and decides what to work on next—even across thousands of fresh context windows and multiple applications.

You should not need to prompt each feature, inspect every PR, or personally discover every bug.

To achieve that, you need to separate three things:

* Human owner: Defines the product's purpose, constraints, and which major decisions require approval.
* Persistent orchestrator: A normal software service that manages tasks, agent sessions, resources, and durable state. It is not an LLM conversation.
* AI agents and subagents: Temporary workers assigned specialized tasks by the orchestrator or a manager agent. Their contexts can expire without losing the organization's progress.

## 1. First, what Storytold demonstrably has

The public Storytold repositories establish this much:

|   Capability   |   Publicly documented?   |
| --- | --- |
|   Agents select tasks from a ranked backlog   |   Yes   |
|   Agents research, implement, test, and continue   |   Yes   |
|   Agents can inspect and control the actual application   |   Yes   |
|   Multiple agents work in parallel using separate Git worktrees   |   Yes   |
|   Progress is recorded for subsequent sessions   |   Yes   |
|   Shared development standards across applications   |   Yes, though the `craftrules` repository is private   |
|   An autonomous AI manager creates all subagents   |   Not verified   |
|   A persistent service automatically restarts expired sessions   |   Not verified   |
|   Fully autonomous discovery of every hidden competitor feature   |   Not verified   |
|   Humans only provide the initial product idea   |   Not verified   |

Their [FilmCraft autonomous work protocol](https://github.com/storytold/filmcraft/blob/main/docs/agents.md?utm_source=chatgpt.com) is particularly revealing. It tells a working agent to pick the next unchecked task, define acceptance tests, implement, run `cargo xtask ci`, drive the real UI, record results, commit, and proceed to another task. Humans are explicitly reserved for issues such as licensing, spending, publishing, personal data, and destructive Git operations.

GitHub+2

That's a strong foundation. But their private task-level plans and orchestration are not available for us to reproduce exactly.

Below is the complete architecture I would build for Kites and future applications using their publicly demonstrated practices, plus the missing autonomous management and exploration layers. Everything below is a proposed implementation, not an assertion that Storytold runs precisely this system.

## 2. The complete organizational structure

HUMAN — Founder / product owner

Gives the founding prompt, sets budgets and approval policy, handles exceptional decisions

SOFTWARE — Persistent orchestrator

Starts agents, distributes tasks, handles retries, worktrees, context resets, CI, and durable storage

AI — Portfolio manager

Distributes capacity among Kites and your other apps; launches a project-manager session for each active app

AI — Kites PM

Chooses Kites priorities and delegates work

AI — App B PM

Independently manages another app

AI SUBAGENT WORKER POOL

Discovery

QA / Evaluation

Architecture

Implementation

Review / Security

Performance

Shared persistent project state

Requirements, feature graph, exploration frontier, source index, tests, evidence, architecture decisions, budgets and checkpoints

Who creates the subagents?

The AI project manager decides which type of worker is needed and requests it. The software orchestrator creates the actual session, checks permissions and available resources, gives it a bounded task, and records the result.

The manager itself is also a temporary session. It does not need to remain running forever: the orchestrator starts a fresh manager whenever new decisions are necessary.

For example:

```
Kites Manager:
  create_task(
    role="qa",
    objective="Investigate typesetting regressions",
    project="kites",
    priority=90
  )

Orchestrator:
  1. Store task in database
  2. Check resource budget
  3. Claim an isolated worker environment
  4. Construct task-specific context
  5. Launch a new ZCode agent session
  6. Collect outputs and evidence
  7. Notify Kites Manager
```

You do not type this prompt. The manager generates the task from the product state, and the orchestrator turns it into a worker session.

## 3. The full sequence: from one human prompt to continuous development

Here is the exact division of responsibility.

|   Stage   |   Who initiates?   |   Who executes?   |   Does the human intervene?   |
| --- | --- | --- | --- |
|   0. Define the app   |   Human   |   Human gives initial vision   |   Yes, once per app   |
|   1. Bootstrap the repo   |   Orchestrator   |   Bootstrap agent   |   No   |
|   2. Understand existing code   |   Bootstrap agent   |   Code-indexing subagents   |   No   |
|   3. Build initial feature inventory   |   Project manager   |   Research/discovery subagents   |   Usually no   |
|   4. Explore uncharted behaviors   |   Scheduler   |   Discovery subagents   |   No, unless access or meaning is ambiguous   |
|   5. Find bugs and gaps   |   Test triggers / manager   |   QA and comparison subagents   |   No   |
|   6. Prioritize features   |   Scheduler   |   AI project manager   |   No for routine priorities   |
|   7. Plan implementation   |   Project manager   |   Architecture/planning subagent   |   No   |
|   8. Define acceptance tests   |   Project manager   |   Independent QA subagent   |   Usually no   |
|   9. Write code   |   Orchestrator   |   Implementation subagent   |   No   |
|   10. Debug failures   |   CI / QA results   |   Debugging subagent   |   No   |
|   11. Review code quality   |   Orchestrator   |   Review and architecture subagents   |   No   |
|   12. Merge accepted changes   |   Orchestrator   |   Automated Git/CI process   |   No for authorized low-risk changes   |
|   13. Update system knowledge   |   Orchestrator   |   Indexers + documentation agents   |   No   |
|   14. Determine next work   |   Scheduler   |   Fresh manager session   |   No   |
|   15. Release, spend, or change major product direction   |   Approval policy   |   Human decides, agent executes   |   Yes, when necessary   |

Stages 3–14 are recurring. They don't run just once.

### Stage 0: YOU give one founding prompt per application

For Kites, an example is:

Human → AI project organization

Copy

Build and continuously improve Kites, a local-first browser extension that translates manga and comic images directly on web pages.

Preserve the original artwork and automate detection, OCR, translation, inpainting, and typesetting. Optimize for translation accuracy, visual fidelity, multilingual support, reliability, browser compatibility, and performance.

Research missing capabilities, discover failures, design improvements, implement, test, and maintain the codebase without asking me to assign individual features.

Use the existing repository and its documentation as evidence, but verify outdated assumptions. Make reversible local engineering decisions and merge changes that pass authorized quality gates.

Escalate external releases, legal/licensing concerns, spending above the set budget, security-sensitive decisions, and substantial product-direction changes. Report measured outcomes and unresolved uncertainties.

That's the founding charter. You don't supply a list of all future features.

You'll still need to establish practical boundaries: cost limits, allowed websites and reference materials, who may publish, what counts as an acceptable quality threshold, and which actions require approval. Those can be configured once and revised later.

### Stage 1: Bootstrap — automatic

Triggered when a new project is registered

The orchestrator creates one bootstrap-agent task.

This agent examines the existing repository, runs the app, reads available documentation, identifies the build process and tests, and maps major components.

It does not attempt to understand and document every line before proceeding.

It produces an initial source-symbol index, a map of important workflows, known tests, baseline performance results, and a list of uncertainties. It records where the existing evidence is insufficient.

For Kites, it might identify:

```
Chrome content script
  → image selection
  → region detection
  → OCR
  → text grouping
  → inpainting
  → translation
  → text layout
  → rendering
```

Each stage receives source references, ownership boundaries and known test entry points.

Human involvement: none, unless the application can't be built because the necessary credentials, permissions or external access are unavailable.

### Stage 2: Discovery — automatic and continuous

Triggered by unexplored areas, new research, feedback, and scheduled exploration

The project manager creates discovery tasks such as:

* Explore text-bubble layouts not covered by the test corpus.
* Compare Kites against relevant manga translation applications.
* Investigate alternative OCR recognizers for vertical Japanese text.
* Examine the browser behavior of websites not yet covered.
* Identify unsupported image layouts or interaction sequences.

Each discovery subagent receives a leased exploration frontier, not the entire application history.

It records observations, screenshots, exact reproduction steps, confidence levels and new unexplored branches in the persistent database.

If the task runs out of context, the next agent starts from the latest saved frontier. It does not scan every known feature again.

For competitor applications, the agent should use lawful black-box observation and public documentation rather than copying proprietary source code or circumventing access restrictions.

### Stage 3: Evaluation — automatic and continuous

Triggered by every accepted code change, plus independent recurring test runs

An independent QA agent executes Kites on a curated set of manga images and websites.

The evaluation infrastructure checks measurable properties: OCR accuracy where labeled data exists, missing regions, overlapping text, altered pixels outside intended masks, browser regressions, crashes, memory consumption and translation latency.

A visual-evaluation agent can identify additional suspicious outputs, but its judgment is not the sole pass/fail oracle.

If it discovers a problem, it creates a reproducible issue:

YAML

```
issue: KITES-428
category: visual-regression
severity: high

fixture: manga_vertical_027
expected: translated text stays within bubble
actual: translation overlaps adjacent artwork

evidence:
  screenshot: artifacts/428/failure.png
  regions: artifacts/428/regions.json
  pipeline_trace: artifacts/428/trace.json

suspected_component: typesetting
verification_status: failed
```

That issue becomes a new backlog candidate automatically.

### Stage 4: Prioritization — automatic

Triggered when tasks arrive, priorities change, or workers become available

The orchestrator launches a project-manager agent with only the information required to prioritize work:

* Current goals and non-negotiable constraints.
* Outstanding issues and their evidence.
* Measured quality trends.
* Dependencies and estimated costs.
* Active worker assignments.
* Uncertainty in the current feature inventory.

The PM then chooses between discovery, implementation, bug fixes, performance optimization, and architecture work.

For example, it might decide that a broken pipeline stage affecting many translations has higher priority than adding another OCR model.

The PM requests workers through the task API. It cannot bypass the orchestrator's budget and approval constraints.

### Stage 5: Architecture and tests — automatic

Triggered when the PM accepts an issue for implementation

The architecture subagent receives the relevant source map and the feature's behavioral requirements.

It decides which modules should change, whether interfaces need revision, and which dependencies or design invariants must remain intact.

A separate QA-planning subagent establishes acceptance cases before the implementation is evaluated.

For example, a typesetting fix needs tests for narrow bubbles, vertical text, long translations, multiple neighboring bubbles and save/reload behavior—not just the single failing screenshot.

If the plan violates an existing architectural contract, the architecture agent must produce a reviewed change to that contract, not quietly ignore it.

### Stage 6: Implementation — automatic

Triggered after an implementation task has a defined objective and verification conditions

The orchestrator creates an isolated Git worktree and launches a coding worker.

The coding agent reads only the relevant source, requirements, design constraints and regression fixtures. It implements the change and runs targeted tests.

It can create narrowly scoped helper subagents if permitted, but that delegation is bounded by the task's resource budget.

When complete, it submits a commit and machine-readable task result. It doesn't declare the issue resolved simply because the code compiles.

### Stage 7: Verification and debugging — automatic

Triggered by implementation completion

The orchestrator runs deterministic gates and sends results to an independent QA worker.

If a test fails, the task returns to debugging with the failure evidence. If the same failure repeats beyond a retry limit, the task is marked blocked and the PM must consider a different approach.

The coding agent can't simply delete the difficult test or lower the benchmark to make the check pass. Changes to test oracles and quality thresholds require independent approval.

When the fix passes, an architecture/review worker checks maintainability, unintended changes, security and consistency with the product requirements.

### Stage 8: Merge, learn, repeat — automatic

Triggered when all required quality gates pass

For an authorized low-risk change, the orchestrator merges the branch and records the accepted commit.

It then updates the implementation index, associated feature statuses, test evidence, architectural decisions and outstanding gaps.

Most importantly, it invalidates any old evidence that may no longer apply. A feature verified against an old renderer is not automatically verified after that renderer has changed.

The PM receives the new project state and selects the next task.

Nothing requires you to enter another feature prompt.

## 4. What makes this survive thousands of context resets?

This is the most important infrastructure decision.

A worker's conversation is never the source of truth.

Each worker interacts with external state through tools. Every meaningful observation, task transition, accepted decision and verification result gets saved outside the session.

For example, I'd use the following storage model:

|   Data   |   Storage   |   Used by   |
| --- | --- | --- |
|   Product vision and approval policy   |   Versioned project configuration   |   PM, all workers   |
|   Feature inventory and coverage   |   PostgreSQL or SQLite   |   Discovery, PM, QA   |
|   Unexplored UI states   |   Persistent exploration queue   |   Discovery workers   |
|   Source symbol → feature mapping   |   Code index + database   |   Architects, coders   |
|   Architecture decisions   |   Versioned documents   |   Architects, reviewers   |
|   Test results and performance history   |   Database + artifact storage   |   QA, PM   |
|   Screenshots and reproduction fixtures   |   Files or object storage   |   Discovery, QA   |
|   Worker progress and task dependencies   |   Durable task queue   |   Orchestrator   |
|   Code changes   |   Git commits and worktrees   |   Coding workers   |
|   Agent transcripts   |   Diagnostic log storage   |   Auditing and debugging   |

Consider a discovery agent that has been exploring Japanese vertical-text behavior for several hours.

It has already examined hundreds of cases and is halfway through another.

Before the session ends, its state is:

YAML

```
task_id: DISC-1042
project: kites
status: running

exploration:
  partition: vertical-japanese
  completed_cases: 438
  current_case: 439

checkpoint:
  fixture: japanese_439.png
  phase: compare-rendered-text
  next_action: test-narrow-bubble
  last_artifact: runs/1042/438.json

claim:
  owner: worker-17
  expires_at: 2026-10-31T20:00:00Z
```

When context is exhausted, the orchestrator saves the last valid checkpoint and closes that worker.

It launches a new worker, which gets the task ID, checkpoint and relevant evidence.

The agent's brain is replaced. The organization's state is not.

If a worker disappears unexpectedly, the orchestrator recovers the task after its lease expires, checks committed evidence, and retries only unfinished steps.

For side-effecting operations, it also needs idempotency keys, transactional state updates, and Git commit checks to prevent duplicate actions after retries.

### How the discovery agents avoid scanning everything again

Each explored behavior should have an identity composed of its application, version, relevant state, action, and outcome.

For example:

```
app: Photoshop
version: 27.x
document: RGB, 8-bit
selection: masked-smart-object
action: gaussian-blur
variant: edit-filter-mask
```

When another worker discovers an equivalent state, the system checks its identity and evidence first.

The outcomes are:

|   Database result   |   What the agent does   |
| --- | --- |
|   Known, verified, fresh   |   Skip   |
|   Known, incomplete   |   Continue unexplored branches   |
|   Known, stale   |   Revalidate affected behavior   |
|   Completely new   |   Explore and record   |
|   Conflicting observations   |   Create investigation task   |

An agent never needs to load the full inventory into its context window.

For deeper workflows, store the reproduction sequence or a reproducible document fixture. The worker can replay the minimum required steps.

Importantly, this is not a guarantee of exhaustive feature discovery. Photoshop has an enormous combination of states, and agents will still miss some behaviors. The system should measure the explored frontier and unknowns, not pretend that an empty queue proves complete parity.

## 5. How the manager actually decides to spawn new agents

I would make this an event-driven system, not a single permanent AI manager that repeatedly asks itself what to do.

|   Event   |   Orchestrator action   |   Agent launched   |
| --- | --- | --- |
|   New app registered   |   Schedule project bootstrap   |   Bootstrap agent   |
|   Unexplored reference states available   |   Claim a partition   |   Discovery agent   |
|   New reference behavior found   |   Check implementation mapping   |   Coverage agent   |
|   Behavior missing   |   Generate research/implementation proposal   |   Planning agent   |
|   Tests reveal a regression   |   Create high-priority investigation   |   Debugging agent   |
|   Task accepted for implementation   |   Allocate worktree   |   Coding agent   |
|   Code committed   |   Run test pipeline   |   QA/reviewer agents as needed   |
|   Architecture invariant violated   |   Block acceptance and request remediation   |   Architecture agent   |
|   Quality score drops   |   Open regression investigation   |   QA and debugging agents   |
|   No urgent engineering tasks   |   Evaluate backlog and exploration gaps   |   Product-manager agent   |
|   Many pending tasks   |   Rebalance worker slots and budgets   |   PM proposal + deterministic scheduler   |
|   Worker fails or times out   |   Recover checkpoint and retry   |   Replacement worker   |
|   Required human decision   |   Pause the affected task   |   No worker until approval   |

The manager decides what work is worth doing and which role is appropriate.

The orchestrator decides whether it is allowed to run, how many workers can run, where they run, what resources they receive, and whether their outputs satisfy mechanical constraints.

A simplified implementation would look like this:

```
def handle_event(event):
    project = db.get_project(event.project_id)

    if event.type == "new_app":
        queue.create("bootstrap", project.id)

    elif event.type == "new_reference_behavior":
        queue.create("coverage_analysis", project.id,
                     evidence_id=event.evidence_id)

    elif event.type == "regression_detected":
        queue.create("debug", project.id,
                     issue_id=event.issue_id,
                     priority="critical")

    elif event.type == "implementation_complete":
        queue.create("independent_verification", project.id,
                     commit=event.commit)

    elif event.type == "verification_passed":
        queue.create("architecture_review", project.id,
                     commit=event.commit)

    elif event.type == "review_passed":
        if policy.allows_auto_merge(event):
            merge_verified_change(event)
            queue.create("update_knowledge", project.id)
        else:
            db.request_approval(event)

    elif event.type == "worker_failed":
        queue.retry_from_checkpoint(event.task_id)

    elif event.type == "planning_needed":
        queue.create("project_manager", project.id)
```

This is illustrative orchestration logic, not a ready-to-run program.

The loop doesn't depend on an LLM remembering that it should restart itself.

Also, don't automatically spawn 10 agents just because 10 tasks exist. Apply concurrency limits, dependency checks, conflict detection, and capacity budgets before launching them.

## 6. Running multiple applications concurrently

Here's how the same system scales beyond Kites.

One shared orchestrator

Scheduler · budget control · agent launcher · task queue · review policies

Kites

AI project manager

OCR discovery

Translation QA

Typesetting coder

App B

AI project manager

Reference exploration

UI coder

Regression QA

App C

AI project manager

Architecture

Feature coder

Performance QA

Shared engineering standards

Reusable agent prompts · test tooling · security policies · architecture patterns · infrastructure

You don't need a different orchestration system for every app.

Each application gets its own product charter, task backlog, test fixtures, feature inventory, implementation mapping and architectural context.

The organization shares agent definitions, coding rules, test infrastructure and resource management.

A portfolio-manager session periodically makes higher-level decisions: for example, allocating additional worker slots to Kites because its regression rate increased, while reducing new-feature development on an app awaiting a release decision.

But one app's agents should not arbitrarily modify another app's source or access its credentials.

If you want reusable improvements across apps, create shared libraries and a separate integration-validation process. Storytold has a similar public pattern through its shared `craft-libs` repository and private shared `craftrules` standards.

GitHub

## 7. Exactly when the human gets involved

For minimal human involvement, you need an explicit approval policy.

Here is the policy I would start with—not necessarily Storytold's exact policy.

Fully autonomous

Research, isolated local experiments, bug triage, test creation, reversible implementation changes, architecture audits, benchmark runs, documentation updates and authorized low-risk merges.

Human approval required

Major product-direction changes, new legal or licensing commitments, higher spending limits, credential access, potentially destructive operations, collecting or disclosing personal data, publishing externally, and security-sensitive releases.

Unknown or ambiguous product decision

The agent produces alternatives, evidence, expected impact, tradeoffs and a proposed default. Only that dependent workstream pauses while the rest of the system continues.

The user should receive decision requests, not implementation questions.

For instance, instead of asking:

> How should I fix this OCR bounding-box bug?

The engineering team fixes it autonomously.

But if the system discovers that supporting a new translation model requires a 2 GB download and changes the product's local-first experience, it might ask whether that tradeoff is acceptable.

Another important boundary: do not grant unreviewed agents unrestricted shell commands, browser credentials, production access or global file-system write permissions. Even local autonomous work should happen in disposable, restricted environments with bounded resources.

### What would you actually see each day?

Instead of reviewing every commit, you receive an aggregated report such as:

Kites — Engineering report

Illustrative

# 12

Verified changes

# 38

New test cases

# 2

Decisions needed

Autonomous work completed

Improved long-text fitting, resolved two browser regressions, extended Japanese OCR fixtures and updated typesetting documentation.

Still investigating

Vertical text detection on rotated images; a Chromium-specific rendering anomaly.

Your input requested

Approve an optional 2 GB model download? Approve publishing the next extension version?

The numbers are fictional, showing the reporting format rather than actual Kites activity.

This is closer to a founder reading an engineering team's report than a developer guiding every coding session.

## 8. How to implement this with ZCode specifically

There is a useful discovery here: ZCode already has a non-interactive Agent CLI.

Its own documentation describes using the CLI as a task executor, with an external launcher responsible for environment isolation, resource budgets, time limits and independent scoring. This is almost exactly the boundary needed for the architecture above.

GitHub+1

The documented CLI arguments include:

Bash

```
zcode \
  --prompt "$TASK_PROMPT" \
  --cwd "$ISOLATED_WORKTREE" \
  --mode yolo \
  --disallowed-tools "AskUserQuestion EnterPlanMode ExitPlanMode" \
  --output-format stream-json \
  --no-color
```

This is appropriate only inside a restricted worker sandbox where unattended execution is authorized. Don't use unrestricted `yolo` mode against your everyday working directory or credentials.

In your system, `$TASK_PROMPT` would be generated automatically by the manager from structured task records.

For example:

```
ROLE: Implementation worker

PROJECT: Kites
TASK: KITES-428

OBJECTIVE:
Fix translated text overlapping neighboring bubbles.

REQUIRED CONTEXT:
- Product contract: typesetting-012
- Relevant code symbols: [...]
- Reproduction fixture: manga_vertical_027
- Acceptance tests: tests/visual/428/*
- Architectural rules: docs/architecture/rendering.md

PERMISSIONS:
- Modify assigned worktree only
- No production deployment
- No changing acceptance thresholds

ON COMPLETION:
- Commit changes
- Output machine-readable results
- Include verification evidence
- Record unresolved failures
```

Your orchestrator launches that ZCode process, collects its `stream-json` output, records the outcome, and runs independent verification.

ZCode is the worker runtime. It needn't be responsible for managing the whole engineering organization.

For persistence across tasks, its documentation also describes explicit session resume and isolated worker data directories. But I would still keep the authoritative task state outside ZCode so that an expired or corrupted session can be replaced by an entirely fresh worker.

GitHub

### What technology should run the orchestrator?

I'd use this stack for a serious implementation.

|   Layer   |   Starting choice   |   Why   |
| --- | --- | --- |
|   Durable orchestration   |   Temporal   |   Retries, task scheduling, crash recovery, parallel workflows, human-approval waits   |
|   Project/feature state   |   PostgreSQL   |   Transactional task leases and queryable records   |
|   Evidence/artifacts   |   Local disk initially, S3-compatible storage later   |   Screenshots, traces, fixtures, reports   |
|   Worker runtime   |   ZCode CLI   |   Existing coding and tool-use harness   |
|   Code isolation   |   Git worktrees + sandbox/container   |   Parallel work without interfering edits   |
|   Quality gates   |   CI + Playwright + targeted evaluation tools   |   Independent verification   |
|   Human dashboard   |   Simple web UI   |   Product decisions, approvals, reporting   |

Temporal's documentation explicitly supports durable multi-agent workflows and human-approval waits, so it's a reasonable choice instead of inventing your own crash-recovery system.

Temporal Documentation+1

For a prototype, you can use Python, SQLite and a process supervisor. You don't need Temporal or a distributed database on day one.

## 9. The build order I would actually follow

Trying to construct an autonomous 20-agent organization immediately would create coordination overhead before you've proven that any worker can independently identify and verify useful work.

I'd implement it in three phases.

## 01

Autonomous regression loop

First working milestone

Connect ZCode to a persistent task queue. Give QA a small fixed corpus of Kites end-to-end tests. Make failing cases automatically create tasks, launch coding workers, verify fixes and record evidence.

Success criterion: a known Kites regression can be discovered, fixed, independently verified and merged without another human prompt.

## 02

Autonomous discovery and planning

Second milestone

Add the feature graph, reference-app observations, exploration frontier, implementation index and a project-manager agent that can create new work independently.

Success criterion: the system independently discovers a previously undocumented Kites limitation, implements a targeted improvement, and proves the result.

## 03

Multi-app engineering organization

Third milestone

Add separate project managers, shared standards, dynamic worker pools, cross-project resource allocation, and a human approval dashboard.

Success criterion: multiple apps progress independently while project knowledge, Git workspaces, test artifacts and permissions stay isolated.

## 10. The crucial takeaway

The complete system has two independent feedback loops:

Discovery loop

Explore → observe → compare → record gaps → prioritize → explore further.

Answers: What should we build next?

Engineering loop

Specify → implement → test → debug → review → integrate → repeat.

Answers: How do we build it correctly?

The project manager connects those loops. The orchestrator keeps them operating. The database ensures discoveries and engineering decisions survive every session reset. Humans intervene only where an agent lacks sufficient authority, evidence or reliable judgment.

And that is what makes your goal different from simply installing a `self-improving` skill.

Storytold's public repositories demonstrate many components of the engineering loop, but not the entire autonomous management system. The additional discovery engine, persistent task scheduler, independent evaluation, and dynamic agent management described here are the pieces I would add.

The result still won't be guaranteed AGI-level autonomous product development. Agents may miss important features, generate incorrect tests, make poor design decisions, or require humans to recognize problems outside the current evaluation model. But this architecture can substantially reduce routine human prompting and make autonomous progress across sessions and applications technically feasible.

For Kites, the single most valuable first step is to get one complete issue-discovery → implementation → independent-verification → knowledge-update cycle running unattended. Once that works reliably, adding more agents and more applications becomes an engineering scaling problem rather than an attempt to give a model permanent memory.

* * *

**You:**

do they have like ? script to spawn agent or sth? like cludecode   script file or sth else? what all app they use, do they open source those

* * *

**ChatGPT:**

I found several open-source repositories for Storytold's development infrastructure—but not a public script that launches and manages all their coding agents.

The important distinction is that they have open-sourced substantial supporting tooling: shared CI pipelines, engineering instructions, test automation, agent-facing application controls, and even a dashboard for monitoring all their repositories.

However, none of these is demonstrably the central controller that creates 10–20 Claude Code sessions, assigns them tasks, restarts them, and keeps them working unattended.

## 1. The actual repositories you should inspect

|   Repository   |   What it contains   |   Agent launcher?   |
| --- | --- | --- |
|   [craft-common-actions](https://github.com/storytold/craft-common-actions?utm_source=chatgpt.com)   |   Reusable GitHub Actions for CI, builds, releases, packaging   |   No verified agent spawning   |
|   [craft-repo-status-app](https://github.com/storytold/craft-repo-status-app?utm_source=chatgpt.com)   |   Desktop dashboard monitoring issues, PRs, builds and project activity   |   No, it's a monitoring dashboard   |
|   [craft-contrib](https://github.com/storytold/craft-contrib?utm_source=chatgpt.com)   |   Shared contributor and coding-agent guidelines, RFC process   |   No   |
|   [craft-skills](https://github.com/storytold/craft-skills?utm_source=chatgpt.com)   |   Intended shared agent-development skills corpus   |   Currently essentially a placeholder   |
|   [PhotoCraft AGENTS.md](https://github.com/storytold/photocraft/blob/main/AGENTS.md?utm_source=chatgpt.com)   |   Mandatory agent behavior and development rules   |   Instructions only   |
|   [PdfCraft CLAUDE.md](https://github.com/storytold/pdfcraft/blob/main/CLAUDE.md?utm_source=chatgpt.com)   |   Project-specific instructions for Claude-compatible coding workflows   |   Instructions only   |
|   `storytold/craftrules`   |   Internal engineering standards referenced by their apps   |   Private   |

These are genuinely relevant, but installing them won't automatically turn ZCode into Storytold's development organization.

storytold/craft-common-actions · GitHub+4

## 2. Which coding agents and development tools do they use?

From the public configurations, here's what I can identify.

|   Tool   |   Evidence   |   What it does   |
| --- | --- | --- |
|   Claude Code   |   `CLAUDE.md` in PdfCraft and GridCraft; `claude mcp add` in PhotoCraft docs   |   Coding agent and MCP integration   |
|   GitHub Actions   |   Shared `craft-common-actions` workflows   |   Automatic tests, builds, quality gates and releases   |
|   CodeRabbit   |   `.coderabbit.yaml` in PhotoCraft and other projects   |   AI-assisted PR review configuration   |
|   Sonar   |   `sonar-project.properties`   |   Static code-quality analysis configuration   |
|   Git / worktrees   |   Agent concurrency instructions   |   Isolates concurrent code changes   |
|   Cargo xtask   |   `cargo xtask ci`, parity and scorecard commands   |   Executes custom engineering checks   |
|   MCP + custom CLIs   |   `photocraft-cli mcp`, `pdfcraft-cli mcp`, etc.   |   Allows agents to operate the actual applications   |
|   Craft Repo Status   |   Dedicated open-source desktop app   |   Monitors GitHub work across all their projects   |

GitHub+4

Claude Code is explicitly supported, but I can't establish that it's the only coding harness they use or identify their exact model/provider configuration for internal development.

### One important distinction: their MCP tools do not spawn coding agents

For example, this is documented:

Bash

```
claude mcp add photocraft -- \
  photocraft-cli mcp \
  --automation-read-root ./workspace \
  --automation-write-root ./workspace
```

But that makes PhotoCraft accessible to an existing Claude Code agent. It doesn't launch another Claude Code worker, assign issues, or restart sessions.

Similarly, `cargo xtask ci` executes tests. It doesn't automatically reason about what new feature should be built.

## 3. What about actual agent spawning scripts?

The specific missing component you're looking for would be something like:

```
orchestrator/
  scheduler.py
  spawn_agent.py
  assign_tasks.py
  resume_agents.py
  merge_verified_prs.py
  config.yaml
```

I haven't verified an official public Storytold equivalent.

And because some of their coordinating documents are explicitly local-only (`plan/STATUS.md`, `plan/execution-plan.md`) or internal (`craftrules`), we can't reconstruct their agent-launching method from `CLAUDE.md` alone.

GitHub

Interestingly, their open-source [Craft Repo Status App](https://github.com/storytold/craft-repo-status-app?utm_source=chatgpt.com) identifies important issues and monitors PR activity across repositories, but it describes a local status dashboard, not a background system that automatically hires coding agents.

GitHub

## 4. I found an open-source alternative that actually spawns agents

![Mission Control | Open-Source Control Plane for AI Agents](https://images.openai.com/static-rsc-4/fzdkyDwu-vu5F385p9nTzTeDcU0DhpT7du2liIUkF2EWkHryEv1pVg5a7RP5g7UFKu7vXMgkzdYcdKvs5uBNU_1a3-QM6tal1oCVLZU6z8S96TYE9XSZwoCQvQZckTwYsZHN2fziBfBPNRcQEhVCnEOcf7LSZ6F3Ho78ceYYqXU?purpose=inline)

[ra3orblade/swarm](https://github.com/ra3orblade/swarm?utm_source=chatgpt.com)

Independent project, not affiliated with Storytold

It provides a real Claude Code control plane: task tracking, agent subprocesses, Git worktrees, execution rules, resource management and progress monitoring.

Its documented commands include:

Bash

```
# Launch Claude Code in a task-specific worktree
swarm run --task X

# Launch multiple ready tasks in parallel
swarm dispatch --ready
```

Internally, it spawns `claude -p` processes and checks their outcomes. This is closer to the actual missing agent-launching layer than Storytold's publicly available repositories.

GitHub

It still doesn't provide the complete autonomous product-discovery organization we discussed. You would need to add a manager that independently creates tasks and decides when to invoke dispatch.

One thing to avoid confusing with an official release: [devsolux/storytold](https://github.com/devsolux/storytold?utm_source=chatgpt.com) is a third-party Claude Code/Codex integration for using the Craft applications. It explicitly says it has no second AI agent or orchestration daemon.

GitHub

## 5. What I would actually copy for Kites

I'd combine the pieces like this:

```
Your Kites repository
       │
       ├── Storytold-style AGENTS.md
       │     Architecture rules
       │     Product requirements
       │     Testing obligations
       │
       ├── Persistent task/discovery database
       │
       ├── AI manager (you must add this)
       │     Discovers work
       │     Prioritizes work
       │     Creates tasks
       │
       ├── Agent launcher (e.g. Swarm)
       │     Starts coding sessions
       │     Assigns worktrees
       │     Tracks executions
       │
       └── GitHub Actions
             Independent checks
             PR validation
             Regression testing
```

You can keep ZCode as your interactive IDE and potentially use its headless CLI for workers, provided the orchestrator supports that runtime.

The key finding: Storytold has open-sourced its applications and a meaningful amount of the surrounding engineering infrastructure. But I still can't identify an official public repository containing the specific agent-spawning and autonomous task-management system you're trying to reproduce.

For that particular part, Swarm is a more directly relevant open-source starting point than `craft-skills` or `craft-common-actions`.

* * *

**You:**

so then if no subagent, no workflow just these tool how this can justify their autonomous workflow that solve 90% probelm i said? do educational guess of high level

* * *

**ChatGPT:**

# My educated guess: Storytold operates an AI development factory, not a self-managing AGI team.

I think their impressive output comes from a human-directed, highly parallelized collection of coding agents, supported by unusually strong engineering infrastructure.

And I suspect the human is doing considerably more high-level planning and coordination than their enormous repositories initially suggest.

My best hypothesis:

* Human: Chooses products to replicate, establishes standards, builds or maintains detailed task plans, initiates or supervises batches of agents, and resolves important decisions.
* Main coding agents: Select tasks from prepared plans, implement them, write tests, update progress, and continue through multiple tasks.
* Parallel agents: Work independently in different Git worktrees, often on different subsystems or applications.
* Deterministic tooling: Automatically checks architecture, builds, tests, command coverage, and some reference behavior.
* Human and community feedback: Reveals the deeper usability problems that automated coverage checks miss.

That explains how they could achieve extraordinary development throughput without having solved the hardest problem you've identified: autonomous understanding of an entire product over thousands of sessions.

This is a hypothesis, not a description of a verified private system.

## 1. The strongest clue: their agents start with a task plan

FilmCraft's public agent documentation says maintainers keep a local, gitignored `plan/` directory containing task-level plans, status, and behavioral reference notes.

It directs an agent to read that status, take the next unchecked task, implement and verify it, record progress, commit, and move to the next task. External contributors without the plan are told to ask a maintainer for a task ID.

GitHub

That's a very revealing distinction.

The task list isn't necessarily created autonomously. The agent's autonomy begins after that list already exists.

A human could instruct a planning agent to research Photoshop's brush system, break it into 200 tasks, and create a persistent execution plan. Then 10 coding agents could work through that plan with little additional human input.

That would look highly autonomous from the GitHub activity, even if a human initially established the plan and periodically corrected it.

## 2. New evidence: they actually used a lead agent plus eight subagents

I found a particularly useful piece of evidence in [CADCraft's target-app-parity.md](https://github.com/storytold/cadcraft/blob/main/docs/target-app-parity.md?utm_source=chatgpt.com).

Its authors say they examined the Claude Code transcripts from the session that built CADCraft's first version.

They report:

Lead agent: 6.9 h

Subagents (8): 4.6 h

Combined work: 11.5 h

Reported output: Approximately 51,000 lines, 290 commands, and 47% menu breadth in its first version.

These are project-reported figures from October 7, 2026, not independent code-quality measurements.

GitHub

This is much stronger evidence than simply seeing `AGENTS.md`.

It establishes that at least one Storytold app used a lead Claude Code session delegating work to subagents.

It doesn't tell us the exact initial human prompt, whether every task assignment was automatic, or how later sessions were launched.

But it makes the following reconstruction considerably more likely.

## 3. My reconstruction of one of their actual development sessions

Human maintainer

Defines target app, establishes or updates task plan, starts lead coding session

Lead Claude Code agent

Reads local plan, architecture, gaps and engineering standards; partitions work by subsystem

Agent 1

Core engine

Agent 2

UI / commands

Agent 3

File formats

Agent 4

Rendering

Agent 5

Editing tools

Agent 6

Automation

Agent 7

Testing

Agent 8

Other subsystem

The eight roles above are illustrative assignments, not verified CADCraft subagent roles.

Lead agent integrates work

Runs tests, fixes integration conflicts, updates progress, commits or prepares PRs

Human / reviewer / CI

Reviews exceptions, handles high-level corrections, starts or authorizes another development batch

I now think Claude Code's built-in subagent delegation is a plausible explanation for a significant portion of their parallelism, without requiring a separate, sophisticated agent-spawning daemon.

PhotoCraft's assessment independently reports that one development session completed about 70 menu items and major subsystems using eight parallel agents. LightCraft reports lead-agent sessions that closed dozens of checklist rows and work performed by 4–6 parallel agents.

GitHub+1

These are consistent with a repeated human → lead coding agent → parallel subagents → integration → next session pattern.

## 4. What happens across days and different applications?

Here's my best estimate of the practical workflow, with confidence levels.

|   Step   |   Likely operator   |   Confidence   |
| --- | --- | --- |
|   Decide to build a Photoshop, Lightroom or AutoCAD alternative   |   Human   |   High   |
|   Establish product target and architectural principles   |   Human + lead agent   |   High   |
|   Research menus, tools and formats; create initial roadmap   |   Lead agent, perhaps research subagents   |   Medium   |
|   Start a development session   |   Human or unpublished automation   |   Unknown   |
|   Read project status and choose tasks   |   Lead agent   |   High   |
|   Divide work among subagents   |   Lead agent   |   High for CADCraft   |
|   Write code and tests   |   Lead agent + subagents   |   High   |
|   Validate commands, rendering, builds and architecture   |   Agents + CI   |   High   |
|   Integrate multiple workstreams   |   Lead agent or maintainer   |   Medium   |
|   Record remaining work and task progress   |   Agents   |   High   |
|   Notice deep quality problems   |   Automated tests + humans + community   |   High   |
|   Start the next batch of work   |   Human, lead agent, or external automation   |   Unknown   |

### What a human might actually type

This is an illustrative prompt, not a recovered Storytold prompt:

Session 1 — Human → Lead agent

Build a clean-room Photoshop alternative in Rust. Research its major workflows through public documentation and observable behavior. Establish a modular architecture, create a feature coverage plan, then delegate independent subsystems to parallel agents. Implement and test as much of the planned functionality as possible. Record unfinished work.

Session 2 — Human → New lead agent

Continue from the project status and execution plan. Prioritize the highest-impact incomplete tasks. Delegate independent work, verify results, update the plan, and continue.

Session 3 — Human → New lead agent

Focus on the current user-reported failures and regression evidence. Fix the highest-priority issues while maintaining the architecture and test requirements.

Notice that the human doesn't have to say "implement the Crop tool" or "write the PSD decoder." Those are delegated after the plan exists.

A fresh lead agent can then take over using the recorded plan. Individual subagents receive only narrow tasks, so they never need to fit Photoshop and PhotoCraft into one context window.

This doesn't eliminate repeated context reconstruction. It drastically limits the amount of context required per worker.

## 5. Why their productivity is so high, despite not solving your full problem

I think the answer comes from four reinforcing advantages.

First: product replication is much easier to divide into tasks than inventing a new product. Photoshop already has a documented menu hierarchy, tool set, file formats, keyboard shortcuts and reference behaviors. An agent can populate a large backlog from those public artifacts without truly understanding every possible workflow.

Second: they've designed their software for parallel development. PhotoCraft and FilmCraft use modular Rust crates, command registries, isolated worktrees and testable headless engines. That lets different agents implement independent capabilities with fewer conflicts.

GitHub+1

Third: they deliberately allow agents to make routine decisions. FilmCraft tells agents to use conventional editor behavior when exact behavior is undocumented, record the decision, and continue instead of asking the human. This accelerates implementation but can produce approximate rather than faithful behavior.

GitHub

Fourth: their communities supply some of the missing product feedback. PhotoCraft's October 10 assessment reported approximately 1,230 filed issues, including many problems with features already considered present. Those issues become ready-made tasks for coding agents.

GitHub

### Their own numbers expose the tradeoff

PhotoCraft feature breadth

# 76%

Ready for real work

# 45%

PhotoCraft's October 10 self-assessment.

GitHub

That's the central insight.

Their system is particularly good at producing large amounts of initial functionality quickly. It is less successful at guaranteeing that every interaction behaves like the reference application.

They've made the implementation process highly autonomous, but the full product discovery and quality-feedback process still isn't proven to be autonomous.

## 6. What I would copy for Kites

I would actually start with something simpler than the complete multi-agent engineering organization we discussed earlier.

You: one product charter

One lead ZCode/Claude Code agent

Reads current state, creates tasks, delegates work, integrates results

Discovery subagents

Implementation subagents

QA subagents

Architecture subagents

Persistent plan + evidence + source index

Sessions continue from existing work rather than rediscovering the entire project

Then introduce a small external launcher that starts a new lead session when the previous one completes or reaches its context limit. That closes the most immediate continuity gap without immediately requiring a complex distributed orchestrator.

Later, you can add the systematic exploration database and independent QA system that Storytold's public approach doesn't conclusively provide.

So my final interpretation is this: Storytold probably isn't running one magical self-improving AI that understands all their applications. They have evidence of lead agents delegating to parallel subagents, an extensive persistent backlog, shared engineering standards, and automated validation. Those ingredients can generate hundreds of PRs with relatively little prompting per feature.

What you originally described—one prompt, followed by months of self-directed discovery, product judgment, architecture evolution and rigorous testing—is still a significantly harder problem.

Storytold demonstrates how far you can get by industrializing AI coding. It does not demonstrate that they've made the human product architect and engineering manager entirely unnecessary.

* * *

**You:**

i having an idea is that the reason human can understand and do the sytem thinking because they know and remember and learn their specific codebase overtime, of course for these sytem it is just simply copy patse exist product, the enginner in big tech already do the system thinking thing to create these prouct for llm but llm struggle when it is build new or project that does not have like reference to copy from and this need developer to do system thingking like mostly all the time so the above system can not apply as it is specically for "porting exist" for new project the workflow above will still work but reuqire human to do the system thinking directly, so then what about automate this system thinking as well by like for each like successful session we train a small llm on the codebase directly so it act as ourself directly it do the system thinking only on high level and this thinking is not like technal it is prompt like us so like it does not have to be like smart as fornt tier model it just need to do the system thinking part and give order then the workflow still call the outer sytem which call like llm api normally ( those that dont learn), i mean clal those llm that can not fit into user machine, and strong for code ? the small llm in the codebase act as is the system thinker, of course we still save memory normally, but beside we do a slef learn fine tuning as well, and this can solve the problem of the big codebase where each new seision is new intern with all document? i mean ai is not dumb it is just our brain is finetune learn all the time so we understadnt eh codebase more than them so do this like automate that system thinking part as well, of course just partially, but still better than nothing, have anyone do this and is it success and is there better and best approach to  this problme of automate the system thinking as well? (like may be no even finetune or sth like complete differe approach solve sam problem) etc this kinda a research lmao

* * *

**ChatGPT:**

# Research: Can a small, continually trained LLM become the permanent “brain” of a software project?

Your idea is technically plausible, and research from 2025–2026 supports several important pieces of it. But I found a more promising approach than simply fine-tuning a small model after every successful coding session.

The strongest design is a project-specialized AI architect with persistent knowledge, learned engineering habits, and access to stronger models when necessary.

That would give you something closer to a developer who has worked on Kites for years, rather than a newly hired coding agent repeatedly reading documentation.

## 1. You're identifying a real weakness in current AI agents

Your distinction between coding intelligence and project understanding is important.

A frontier coding model can be excellent at implementing an algorithm and still lack knowledge of why Kites uses a particular architecture, which compromises were intentional, what users actually want, and which engineering decisions failed six months ago.

That isn't just your impression. Two recent benchmarks make the problem measurable.

RepoProbe — October 2026

Tests understanding of repository architecture, business logic, and implementation decisions, not just fixing bugs.

# 27.5%

Best complete-answer rate among 20 evaluated models

The benchmark uses 500 architectural questions across 50 repositories. Its strongest evaluated model achieved fully correct answers on only 27.5% of questions.

GitHub

NL2Repo-Bench — July 2026

Tests agents building complete software repositories from written requirements without an existing codebase.

# ~40%

Average test pass rate for the strongest agents

The authors report loss of architectural coherence, dependency problems, poor long-horizon planning, and premature stopping.

Proceedings of Machine Learning Research

These are different benchmarks, so their percentages should not be compared as equivalent measures. But both support your broader point: writing correct code and maintaining a correct understanding of a complex software product are different capabilities.

Your proposal is to train the second capability into a persistent, project-specific model.

The important question is whether putting information into model weights actually produces better architectural judgment—or merely makes the model more familiar with project terminology.

## 2. Three ways an AI can learn a codebase

|   Method   |   What gets updated?   |   Main strength   |   Main weakness   |
| --- | --- | --- | --- |
|   Persistent memory / retrieval   |   Documents, database, code index   |   Accurate, updateable project knowledge   |   Model must retrieve and interpret it   |
|   Fine-tuning / LoRA   |   Model parameters   |   Learns recurring patterns, conventions, and decisions   |   Can forget, become stale, or generalize poorly   |
|   Learning from evaluated experience   |   Skills, decision policies, sometimes model weights   |   Learns how the project should be developed   |   Depends on trustworthy success and failure feedback   |

Your idea combines the second and third methods. I would combine all three, rather than replacing external memory with fine-tuning.

The reason is fundamental: knowing the current state of a project and knowing how to make good decisions about it are not the same kind of learning.

## 3. The closest real research projects—and whether they succeeded

These are the most relevant projects I found, ordered by how directly they address your idea.

[Learning to Commit](https://github.com/LearningToCommit/LearningToCommit?utm_source=chatgpt.com)

Closest to your goal

NeurIPS 2026 · Open source · No fine-tuning

This system teaches an agent a repository's development habits from historical commits. It attempts an old task without seeing the original solution, compares its work with the maintainer's commit, and writes the resulting lessons into reusable skills.

Without learned skills: 48%

With learned skills: 56%

Claude Opus 4.6, test pass rate on a 50-task SWE-bench Pro subset. Improvements also appeared in choosing the right files and following repository conventions.

GitHub

Why it matters: It attempts to learn how the original engineers think and work, without retraining the model. That is unusually close to what you want.

[SWE-Protégé](https://arxiv.org/abs/2602.22124?utm_source=chatgpt.com)

February 2026 · Small-model training + expert assistance

This is probably the closest match to your proposed local model managing calls to a stronger model.

Researchers post-trained a Qwen2.5-Coder-7B model to recognize when it was stuck, ask a stronger model for guidance, and act on that advice.

42.4% Pass@1 on SWE-bench Verified

Expert assistance accounted for approximately 11% of generated tokens, with roughly four expert calls per task. It significantly improved the smaller model's performance, although it was evaluated on software repair rather than product-level architecture management.

arXiv

[Improving Code Localization with Repository Memory](https://www.microsoft.com/en-us/research/publication/improving-code-localization-with-repository-memory/?utm_source=chatgpt.com)

Microsoft / Ohio State · ICLR 2026 · External repository memory

The researchers explicitly recognized the same analogy you used: humans gradually acquire repository knowledge, while agents repeatedly start from scratch.

Their system constructs persistent memory from commits, linked issues, and functionality summaries.

Top-5 file localization accuracy: 71.6% → 76.5%

That is a measurable improvement without putting the repository into model weights. It addresses understanding where a change belongs, though not the entire problem of deciding what product to build.

proceedings.iclr.cc+1

[MapCoder-Lite](https://aclanthology.org/2026.findings-eacl.346/?utm_source=chatgpt.com)

EACL 2026 · Fine-tuning a 7B model using stronger-model trajectories

Researchers distilled multi-agent planning, coding, and debugging behaviors into a smaller model using LoRA.

xCodeEval accuracy: 13.2% → 28.3%

This demonstrates that some behaviors of stronger agents can be learned by a much smaller model. But it does not establish that the smaller model can acquire a senior engineer's entire understanding of a changing codebase.

ACL Anthology

[Retrieval-Augmented LLM Agents: Learning to Learn from Experience](https://aclanthology.org/2026.emnlp-main.57/?utm_source=chatgpt.com)

EMNLP 2026 · Combining fine-tuning and experience retrieval

This study compares fine-tuning with retrieved experiences and then trains the model to use those experiences more effectively. The hybrid approach improves generalization to previously unseen tasks.

Why it matters: This is strong evidence that a trained model with access to external experience can be more useful than relying exclusively on either stored memories or weight updates.

ACL Anthology

All the numbers above are the authors' reported experimental results, measured on different benchmarks. They are not estimates of how much better Kites would become.

### What the research establishes

There is credible evidence that agents can learn repository conventions, use past experience, specialize smaller models, and improve at tasks without changing frontier-model weights.

What I did not find is a validated system showing that a 3B–7B model, fine-tuned after every development session on one private project, becomes a reliable, autonomous principal software architect for that project.

So your idea is not science fiction, but the precise version you propose remains an experimental research direction.

## 4. The biggest problem with your fine-tuning proposal

There is one assumption I would change:

> The system-thinking model doesn't have to be as smart as a frontier coding model, because it only needs to think at a high level.

I would argue that high-level system thinking is often more difficult than implementing a well-defined function.

Consider Kites.

A coding worker is told to optimize WebGPU inpainting memory usage. That is a relatively concrete task: measure memory, inspect allocations, implement changes, benchmark.

But the project architect must decide whether Kites should:

* Keep five separate AI pipeline stages or merge some of them.
* Use a single universal OCR model or a tiered recognition system.
* Optimize individual speech bubbles or batches of page regions.
* Preserve local-first processing or introduce optional cloud inference.
* Invest in model quality, browser compatibility, or a complete rendering redesign.

Those decisions require understanding future dependencies, product expectations, deployment costs, user experience, and uncertainty.

Remembering the project's history helps enormously, but it does not automatically provide the intelligence required to make those decisions.

I would therefore give the small model the role of resident project expert and engineering coordinator, while retaining access to a frontier model for difficult architectural reasoning.

This also matches SWE-Protégé's central finding: smaller models become more useful when they learn when to request expert help.

Lacuna by Tiptree Systems

## 5. The architecture I would build: a project-resident AI brain

I would combine your idea with persistent memory and a stronger reasoning model.

YOU — Product founder

Define vision and resolve major product tradeoffs

LOCAL PROJECT BRAIN — 3B–7B LLM

Project-specific LoRA + persistent memory retrieval

Understands

Product goals and historical decisions

Remembers

Past failures and architectural constraints

Plans

Priorities, dependencies and tasks

Escalates

Novel or uncertain architectural questions

FRONTIER ARCHITECT — API

Called for hard design decisions, research, novel problems and independent review

Research agent

Coding agent

QA agent

DURABLE PROJECT KNOWLEDGE

Current architecture graph · decision records · Git history · lessons · tests · user feedback

Verified experiences become future memory and training examples

The local model is the project's resident coordinator, not the storage system. The memory and source index remain authoritative and are kept current even when its weights are months old.

The workflow would look like this:

New development request or discovered bug: The local model retrieves relevant product history, current architecture, and previous decisions. It decides whether to investigate, implement, test, or request expert reasoning.

Novel architectural decision: It prepares a compact, evidence-backed briefing for the frontier model. The frontier model proposes options and their consequences. The local model records the accepted decision and its rationale.

Implementation: Coding agents carry out the approved design. Independent QA measures whether the change satisfies the actual product goal.

Learning: The system captures the decision, evidence, outcomes and mistakes. Those become durable memories immediately and, when enough reliable examples accumulate, candidates for fine-tuning.

This is how you could develop a continually improving project specialist without expecting one context window or one model to contain the entire project.

## 6. What should actually be fine-tuned?

This is where I would modify your proposal most significantly.

Do not train primarily on the codebase. Train on the decisions made while developing the codebase.

Source code answers what the system does. Engineering decisions explain why it is designed that way and what should happen next.

For example, suppose a successful session changes Kites's OCR architecture.

A raw training record might contain 60,000 tokens of file reads, terminal output, attempted fixes, errors and generated code.

That is a noisy training example. Much of the content was merely exploratory or wrong.

Instead, distill it into a structured engineering decision:

YAML

```
project: kites
decision: OCR-ARCH-031

situation:
  problem: Japanese text recognition is inaccurate
  constraints:
    - local-first processing
    - limited memory
    - fast initial load

alternatives:
  - replace all OCR with a larger model
  - keep lightweight detection
  - use a larger recognizer selectively

selected:
  lightweight detection + selective recognition

reasoning:
  - avoids loading heavy recognition for easy regions
  - preserves lightweight default mode
  - separates detection from recognition
  - supports future recognizer replacement

outcome:
  status: accepted
  benchmark: evals/ocr/031.json
  verified_commit: abc123

lesson:
  Prefer modular stages when models have
  different performance and memory tradeoffs.
```

This is an illustrative record, not a claim that this decision was actually made or measured in Kites.

From that record, you can generate training examples where the input is the engineering situation and the expected output is a sound plan, relevant constraints, uncertainty, and appropriate next actions.

Better still, record the rejected decisions and why they failed. A system trained only on successes won't learn to avoid attractive but damaging alternatives.

The best training signal isn't simply "the PR merged." It is whether the decision produced the intended user-visible behavior, respected constraints, and held up under later changes.

### Why not update the weights after every session?

|   Problem   |   What goes wrong   |
| --- | --- |
|   Too few examples   |   A single successful session provides weak evidence about general engineering judgment   |
|   Bad training labels   |   Tests passing doesn't prove the architectural decision was good   |
|   Catastrophic forgetting   |   Repeated updates can degrade previously learned behaviors   |
|   Stale knowledge   |   The model may retain an old understanding after the architecture changes   |
|   Self-reinforcing mistakes   |   Training on an agent's own unverified conclusions can strengthen incorrect assumptions   |
|   Cost and complexity   |   Retraining, validation, versioning, and rollback become an ongoing engineering burden   |

Continual fine-tuning is possible, especially with LoRA adapters. But the training process should be periodic, curated, and evaluated, rather than triggered blindly after every successful agent session.

Hugging Face's PEFT tooling supports lightweight adapters, separate project adapters, loading and switching them, and training without modifying the entire base model.

Hugging Face

I would use a single general small model with a separate adapter for Kites, not independently retrain a whole model for every application.

## 7. An even better alternative: let the AI learn without changing weights

This is where the Learning to Commit research becomes especially interesting.

Instead of training your model to remember a lesson, save the lesson as an executable or retrievable skill and check whether it improves future results.

For instance:

Development session 47

The agent makes an architecture mistake: it duplicates a translation-cache mechanism already implemented in Kites's offscreen document.

Learning agent

Compares the original proposal with the corrected implementation and identifies the general lesson.

Persistent skill

Before introducing caching in a new pipeline stage, inspect existing cache ownership and invalidation boundaries. Prefer extending the current cache when the lifetime and consistency requirements match.

Development session 126

The next agent retrieves that skill when considering a translation-cache change, preventing the same mistake.

This is procedural learning without weight updates.

The significant advantage is that you can inspect, edit, remove, version, and invalidate learned rules. You can also associate each rule with the evidence that justified it.

And the research supports the mechanism: Learning to Commit improved patch quality and benchmark performance using accumulated skills without fine-tuning model parameters.

GitHub

There's also [Retrospective Harness Optimization (RHO)](https://www.microsoft.com/en-us/research/publication/retrospective-harness-optimization-improving-llm-agents-via-self-preference-over-trajectory-rollouts/?utm_source=chatgpt.com), a June 2026 Microsoft Research preprint. It replays difficult agent trajectories, generates candidate workflow improvements, and evaluates them. The authors report SWE-bench Pro performance increasing from 59% to 78% after one optimization round. That's promising, though it's a reported research result, not evidence that autonomous harness optimization is reliably safe in arbitrary projects.

Microsoft Research

The key distinction is that you can let the development workflow itself improve without repeatedly retraining the LLM that runs it.

## 8. A completely different approach: learn through experiments, not memory

For system thinking, I think this may eventually matter as much as fine-tuning.

Humans don't just remember architecture decisions. They also build hypotheses, experiment, observe failures, and revise their mental models.

An AI system could do the same.

For example, the project architect identifies excessive translation latency. Instead of immediately committing to a new architecture, it commissions competing experiments:

Question: How should Kites reduce translation latency?

## A

Batch more speech bubbles

## B

Change the inference strategy

## C

Improve cache reuse

Automated evaluations

Latency · memory · output accuracy · compatibility · reliability

Evidence-backed architectural decision

Select, reject, or combine candidates; store the result for future work

This approach resembles [AlphaEvolve](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/?utm_source=chatgpt.com) from Google DeepMind, which generates competing implementations and uses automated evaluators to select better solutions. It has produced practical optimization improvements in Google's infrastructure.

Google DeepMind+1

Another relevant project is the [Darwin Gödel Machine](https://github.com/kew-lab/darwin-godel-machine?utm_source=chatgpt.com). It evolves coding-agent implementations themselves and measures whether each version improves benchmark performance. The researchers reported improving SWE-bench performance from 20% to 50% without training new foundation-model weights.

arXiv+1

This is particularly interesting for your system: the agents could improve not only Kites but also their own research, testing, memory and planning workflow.

The limitation is that the system needs a meaningful evaluation signal. It is much easier to measure translation latency or OCR accuracy than whether a product will delight users or whether an architecture will remain maintainable in two years.

## 9. Which approach is best for your goal?

Here is my practical ranking. These are my engineering judgments, not results of a single head-to-head benchmark.

|   Approach   |   Recommendation   |   Why   |
| --- | --- | --- |
|   Persistent architecture model + repository history + retrieval   |   Start here   |   Immediately usable, versionable, grounded in current code   |
|   Automatic learning of project-specific skills and design lessons   |   Add next   |   Closest to accumulating engineering experience cheaply   |
|   Frontier architect with automatic experiments and independent evaluation   |   Essential for novel work   |   Supplies reasoning strength and feedback, not just recollection   |
|   Small local model trained on successful planning decisions, with retrieval and escalation   |   Promising experiment   |   Could improve efficiency and project-specific decision habits   |
|   Fine-tune a small model after every session and let it independently own architecture   |   Don't start here   |   Little direct evidence, substantial risks of stale or incorrect decisions   |

There isn't enough direct research to quantify how much better a fine-tuned project architect would be. Claims like a 50% reduction in human oversight or a 90% solution to context resets would be guesses.

## 10. How I would test your idea on Kites

Rather than invest immediately in a complicated continual-training pipeline, run a controlled experiment.

You need four variants, operating on identical historical Kites tasks.

|   Variant   |   Model   |   Knowledge available   |
| --- | --- | --- |
|   A — Baseline   |   Frontier model   |   Existing repo and `AGENTS.md`   |
|   B — Memory   |   Same frontier model   |   Repo + architecture index + historical decisions and lessons   |
|   C — Local specialist   |   Small local model   |   Same memory, plus frontier consultation when uncertain   |
|   D — Trained specialist   |   Fine-tuned small local model   |   Same memory and consultation mechanism   |

Give each variant the same held-out tasks: explain a historical design, diagnose a regression, identify architectural risks, choose between competing implementations, and plan a feature without breaking established behavior.

Score them on:

* Correctness of architectural claims and evidence.
* Whether proposed designs respect existing constraints.
* Quality of resulting implementation and tests.
* Ability to identify when information is missing.
* Number of repeated engineering mistakes.
* Human interventions, model API cost, and total engineering time.

Use chronological splits: train or extract lessons from older commits, then evaluate on later decisions that were not visible during learning. Don't let test outcomes leak into training data.

For a starting point, I'd use the open-source [Learning to Commit](https://github.com/LearningToCommit/LearningToCommit?utm_source=chatgpt.com) method to generate project-specific lessons, plus a CodeMEM-style structural memory system. CodeMEM's research reported better instruction-following and fewer interaction rounds using AST-guided repository memory.

ACL Anthology

Only if variant D consistently outperforms C on new architectural situations would I automate periodic LoRA updates.

### If you want to implement the fine-tuning component

The existing tools are sufficient:

|   Tool   |   Role   |
| --- | --- |
|   [Learning to Commit](https://github.com/LearningToCommit/LearningToCommit?utm_source=chatgpt.com)   |   Learn repository-specific habits without modifying weights   |
|   [Hugging Face PEFT](https://github.com/huggingface/peft?utm_source=chatgpt.com)   |   LoRA adapters and fine-tuning   |
|   [Unsloth](https://github.com/unslothai/unsloth?utm_source=chatgpt.com)   |   Practical local model training   |
|   [MLX / MLX-LM](https://huggingface.co/docs/hub/mlx?utm_source=chatgpt.com)   |   Training and serving on Apple Silicon   |
|   [RepoProbe](https://github.com/Tencent-Hunyuan/RepoProbe?utm_source=chatgpt.com)   |   Adaptable benchmark for testing actual architecture comprehension   |

You would still need to implement the data extraction, validation, training curriculum, knowledge indexing, and project-specific evaluation loop. None of those packages alone provides a complete self-learning software architect.

## 11. The actual unsolved problem

I think your original hypothesis contains two separate goals:

Goal A: Make the AI remember and understand a project like a long-serving engineer.

This is increasingly tractable. Repository memory, architectural decision records, retrieval, skills, historical replay, and eventually fine-tuning can all contribute.

Goal B: Make the AI independently develop good new product ideas and architectural strategies, without an existing reference application or constant human direction.

This is much harder.

A system can remember every engineering decision ever made in Kites and still fail to notice that the onboarding experience is confusing or that the translation architecture is fundamentally misaligned with how users read manga.

To solve that second problem, the AI needs independent evidence of product quality: real-user feedback, observed workflows, performance data, controlled experiments, competitor research, and an explicit representation of the product's intended behavior.

It needs to learn not just what we built and why, but whether our assumptions about the product were actually correct.

That is how system-level judgment can improve over time, rather than merely repeat past engineering preferences.

## Final assessment

Can a small model become a project-specific expert? Yes, to a meaningful extent. Fine-tuning and experience-based learning already demonstrate useful specialization.

Can that expert reduce the new-intern problem? Yes, especially when paired with persistent, versioned knowledge and retrieval.

Can it replace frontier-level architectural reasoning? Not reliably demonstrated. I'd use it to coordinate and supply project expertise, with frontier reasoning for difficult decisions.

Will fine-tuning alone produce autonomous product development? No. It still needs exploration, trustworthy evaluations, hypothesis testing and feedback.

The direction I'd pursue is a continually learning engineering organization, not simply a continually fine-tuned model.

Keep the frontier model's general intelligence. Give it durable, project-specific knowledge. Let a smaller resident model learn the project's routines, constraints, history, and when to escalate. Use independent experiments to generate new knowledge rather than relying exclusively on old solutions. Fine-tune only when the evidence shows that doing so improves decisions.

This has a real chance of reducing the gap between a succession of fresh AI coding sessions and a human engineering team that accumulates experience over years.

And unlike trying to train a local miniature AGI, you can build and measure it incrementally with technology available today.

* * *

**You:**

1 selection
so what i mena is like the finetune model is finetune on that repo and work on that repo only like a engineer work on a company learn a codebase overtime to develop their system thinking toward that codebase only, and human. brain work exactly like not like finetune overall for all, that is job of frontier ai lab, i mean like i try to replicate human engineer at first when first face the code like intern both human and ai like performa the same(ai is actually better) but because engineer train themself overtime and become senior dev they is better not becuase they are smarter than the frontier ai model it is becuase their brain alteringa nd remember the codebase over time. i just want clarify, did this align with what you understand my prompt above? if you already undertstnad then just said yes you already did

* * *

**ChatGPT:**

Yes, I already understood. You want a repo-specific, continually fine-tuned model that develops deep familiarity and system-level judgment about that particular codebase over time, like a human engineer growing from junior to senior—not a generally smarter coding model.

* * *

**You:**

so the reserach above already follow this request right?

* * *

**ChatGPT:**

Partially, but not completely.

The research addressed your goal, but some examples—especially SWE-Protégé and MapCoder-Lite—focus on improving general coding ability rather than continuously learning one specific repository.

The repository-memory and Learning to Commit research is much closer, but primarily uses external memory or skills rather than fine-tuning model weights.

Your exact idea is: a dedicated model for Kites that continually updates its weights from Kites's development history, gradually acquiring the project-specific understanding and architectural judgment of a long-serving engineer.

That specific approach was not thoroughly researched or validated in my previous answer.

* * *

**You:**

ok then if need add the missing " mean ai is not dumb it is just our brain is finetune learn all the time so we understadnt eh codebase more than them so do this like automate that system thinking part as well, of course just partially, but still better than nothing, have anyone do this and is it success and is there better and best approach to  this problme of automate the system thinking as well? (like may be no even finetune or sth like complete differe approach solve sam problem) etc this kinda a research lmao"
do the reserch again of course like if there better aproach that skip these expensive finetune then well

* * *

**ChatGPT:**

# Research: Can an AI become a senior engineer for one specific codebase?

Yes, there are now research projects that directly experiment with your idea. One especially interesting 2026 project even generates repository-specific model weights and updates them as commits arrive, without repeatedly running conventional fine-tuning.

But the research also points to an important distinction:

Getting an AI to internalize how a repository works is becoming feasible. Getting it to independently develop good system-level judgment about that repository is still an open problem.

I would not start by fine-tuning a small LLM on every successful Kites session. My preferred approach is to build a continually updated project knowledge and decision system, then add learned model weights only when they demonstrably improve decisions.

## 1. The research most directly matching your idea

[Code2LoRA](https://lilianahotsko.com/Code2LoRA/?utm_source=chatgpt.com)

University of Waterloo · June 2026 preprint · [Terminal implementation](https://github.com/LilianaHotsko/c2l-terminal?utm_source=chatgpt.com)

This is the closest research I found to your concept of a permanently project-specialized model.

Instead of fine-tuning a model from scratch for each repository, Code2LoRA trains another network to generate a small LoRA adapter from the repository's code and commit history.

It offers two variants:

* Static: Generate project-specific model weights from a repository snapshot.
* Evo: Maintain a learned state that updates as new commits arrive, then regenerate the adapter.

Base model

# 45.7%

Exact-match completion

Code2LoRA Static

# 63.8%

Exact-match completion

Authors' cross-repository static-track results on RepoPeftBench, using Qwen2.5-Coder-1.5B. The evolution variant scored 60.3% on a different commit-derived task track; these are not system-design scores.

lilianahotsko.com: +1

Their approach is almost a mathematical realization of your hypothesis:

Kites source code + commit history

Learned adapter generator

Kites-specific LoRA weights

Update as repository commits arrive

Small local LLM + Kites adapter

More familiar with project-specific code and conventions

The published prototype uses a 1.5B-parameter code model and approximately 37 MB generated adapters. The authors report that the evolving adapter can incorporate another commit without retraining the complete language model.

lilianahotsko.com

However, the evaluated tasks are mostly code/assertion completion, not independently choosing Kites's architecture, designing its product strategy, or managing autonomous development. This is an important proof of concept for weight-based repository familiarity, not proof of a senior-engineer brain.

## 2. Does fine-tuning on one company's codebase actually work?

Yes, for certain capabilities. Two industrial studies provide more direct evidence than general coding benchmarks.

|   Research   |   Repository studied   |   Result   |
| --- | --- | --- |
|   [IBM Research, 2026](https://arxiv.org/abs/2602.05780?utm_source=chatgpt.com)   |   Two private enterprise codebases   |   Repository-specific fine-tuning substantially improved code-completion accuracy and conciseness   |
|   [Tencent / WeChat, 2025](https://arxiv.org/abs/2505.15179?utm_source=chatgpt.com)   |   More than 160,000 internal C++ files   |   Well-designed retrieval often outperformed fine-tuning alone; combining both helped further   |

These results appear contradictory, but they're not necessarily so.

IBM focused on learning highly specific code patterns—for example, the proper parameters for internal logging calls. Their customized 8B models could produce better project-appropriate completions than much larger uncustomized models in the tested scenarios.

arXiv

Tencent evaluated multiple models and retrieval methods in a large, unfamiliar industrial codebase. Its results favored effective retrieval, especially lexical matching with BM25, and found retrieval scaled better as the codebase expanded.

arXiv

The implication is:

* Fine-tuning is effective at absorbing repeated project-specific patterns.
* Retrieval is effective at finding detailed, changing information in large repositories.
* Neither result proves better high-level architectural judgment.

Your goal is more difficult than producing a correct internal logging call. You want the AI to develop an increasingly accurate understanding of why Kites was designed a particular way, then use that understanding when designing something new.

That requires learning from the repository's evolution, not just its current source files.

## 3. The strongest alternative: learn like a senior engineer, without training weights

[Learning to Commit: Online Repository Memory](https://arxiv.org/html/2603.26664?utm_source=chatgpt.com)

March 2026 · Historical-commit learning · No model fine-tuning

This research is especially relevant to your human-engineer analogy. It argues that the current codebase shows the final implementation but not the reasoning that produced it.

Its solution is to have an agent:

1. Examine an older version of a specific repository.
2. Attempt a historical engineering task without seeing the real solution.
3. Compare its solution against the actual developer's commit.
4. Extract the architectural rules, internal API usage and development habits it missed.
5. Store those lessons and apply them to later, unseen tasks.

No learned repo skills

# 61%

File-overlap accuracy

With learned repo skills

# 80%

File-overlap accuracy

One reported experimental configuration, using Claude Opus 4.6. The experiment also reduced average tool steps from 71.9 to 56.8. Its held-out evaluation was small—seven future tasks from one internal repository—so the result is promising but not conclusive.

arXiv

This is much closer to what you mean by a human gradually becoming a senior engineer.

The agent is not simply memorizing code. It is learning relationships such as:

* Why the project reused one internal API instead of introducing another.
* Which module should own a particular responsibility.
* Which architecture decisions consistently make future changes easier.
* Which apparently good refactors violate established product constraints.

And because the lessons are externally stored, you can update them immediately without GPU training.

### Another important finding: saving more context doesn't automatically help

The February 2026 [SWE-ContextBench](https://arxiv.org/abs/2602.08316?utm_source=chatgpt.com) study found that correctly selected summaries of past engineering experience improved accuracy and reduced costs, while unfiltered or poorly selected experience could provide little benefit or even hurt results.

arXiv

Similarly, the October 2026 [Prism](https://aclanthology.org/2026.findings-emnlp.1301/?utm_source=chatgpt.com) paper found that caching generic file summaries wasn't enough. Its more precise, identifier-grounded memory achieved a 24.9% cost reduction on GPT-5 across its tested maintenance tasks while preserving comparable task quality.

ACL Anthology

So the goal is not to store every token from every session. It is to extract the right project knowledge, link it to concrete evidence, and retrieve it exactly when a design decision needs it.

## 4. The missing piece: learning system-level architecture, not just repository facts

I would distinguish three kinds of project-specific intelligence.

|   Type   |   Example in Kites   |   Best mechanism   |
| --- | --- | --- |
|   Factual knowledge   |   Which component owns OCR output and where translations are cached?   |   Code index + retrieval   |
|   Historical understanding   |   Why did we separate OCR detection and recognition? What alternatives failed?   |   Architecture decision memory + historical replay   |
|   System-level judgment   |   Should we redesign our OCR pipeline to improve future extensibility?   |   Strong reasoning model + experience + experiments   |

Your hypothesis is strongest for the second category.

A model exposed to years of validated Kites design decisions could learn patterns of good architecture specific to Kites.

But I would not assume that putting the entire repository into its training data teaches the third category.

Consider this example.

An agent repeatedly sees that Kites uses a modular processing pipeline. Fine-tuning might teach it to prefer adding new pipeline stages rather than modifying existing ones.

That sounds like useful system thinking.

But what happens when a new feature would actually work better by combining two stages?

The trained model might confidently preserve the old architecture even when changing it would be better.

That's the difference between internalizing a design preference and understanding when that preference should be violated.

The second ability requires counterexamples, experiments, and feedback from outcomes.

### Research that directly measures architectural understanding

[Repository Intelligence Graph (RIG)](https://arxiv.org/abs/2601.10112?utm_source=chatgpt.com)

Rather than training a model, RIG supplies a deterministic graph of components, build dependencies, and tests.

+12.2% average accuracy; 53.9% less completion time.

These are authors' reported results across three coding agents and eight repositories. Its current automatic extraction focuses on CMake, so Kites would require a different extractor.

arXiv

[SWE-QA-Pro](https://github.com/TIGER-AI-Lab/SWE-QA-Pro?utm_source=chatgpt.com)

Researchers trained Qwen3-8B to explore unfamiliar repositories, reason across files, and answer codebase questions using tools.

Their trained 8B model surpassed GPT-4o by 2.3 points on the benchmark.

Unlike Code2LoRA, this trains general repository reasoning rather than specializing in one repository. It's useful as a possible starting model, but does not demonstrate longitudinal Kites-specific learning.

ACL Anthology

[SWE-CI](https://arxiv.org/abs/2603.03823?utm_source=chatgpt.com)

This benchmark tests whether agents can maintain code across evolving requirements rather than merely fix isolated bugs.

Its tasks span an average of 233 days and 71 real commits. It uses an Architect–Programmer agent loop.

The research finds that maintaining software quality across long sequences remains difficult even for strong models.

arXiv

These findings suggest a useful architecture: give the agent a continuously updated representation of the actual software system, let it learn project-specific decision patterns, and evaluate its architecture choices against future changes.

The architecture model becomes the project's durable knowledge, while the LLM is responsible for reasoning over that knowledge.

That is a more reliable starting point than trying to make model weights serve as both memory and architect.

## 5. The system I would actually build for Kites

I would call it a Project-Resident Engineering Brain.

Human product owner

Vision, product boundaries, exceptional decisions

Resident Kites architect

Frontier reasoning initially; potentially a trained local model later

Persistent project intelligence

Code graph

Actual components, dependencies and owners

Decision history

Why designs were chosen or rejected

Experience memory

Past mistakes, solutions, learned rules

Product model

User needs, feature interactions, known gaps

Engineering and experimentation agents

Research · implement · test · compare architectural alternatives

Experience consolidation

Update project memory immediately; periodically evaluate new repo-specific model adapters

The next architectural decision benefits from previous outcomes

### What happens after every successful development session?

Suppose the coding agents modify Kites's translation system.

The system automatically captures the original requirement, architectural options, selected design, files modified, test outcomes, performance effects and any decisions that changed during debugging.

Then a learning agent compares the original plan with the final verified implementation.

It asks what new understanding should be retained, whether existing rules need correction, and whether the change invalidates previous architectural assumptions.

The new knowledge is saved in structured memory immediately.

A later session does not need to reconstruct that history from thousands of commits. It can ask:

> What architectural constraints govern translation caching, and which previous changes established them?

The memory system retrieves the relevant decisions, current code evidence and tests.

Only after enough such records accumulate would I consider training the resident model on them.

### How I would make the system think independently

The resident architect shouldn't simply retrieve information and instruct a coder.

Give it a recurring responsibility: find architectural weaknesses and propose experiments.

For instance, it might observe that the same OCR output is being transformed independently by several modules. Instead of waiting for you to report a problem, it could investigate whether the duplication indicates a missing shared representation.

The process becomes:

Discover a system-level problem

Generate competing architecture proposals

Implement isolated prototypes and evaluate

Choose the evidence-supported option

Save the architectural lesson

This creates a stronger learning signal than treating every merged PR as evidence that the chosen architecture was optimal.

The agent can learn which designs were rejected and why, including cases where the original design looked reasonable but performed badly.

That gets much closer to the experience accumulated by a human senior engineer.

## 6. Should you still fine-tune a local model?

I would treat it as an optional third stage, not the foundation.

Here's my comparative assessment for your exact goal.

|   Approach   |   Potential for project-specific system thinking   |   Cost / complexity   |   My assessment   |
| --- | --- | --- | --- |
|   Fine-tune on raw Kites code   |   Limited   |   Medium   |   Not worth starting with   |
|   Fine-tune on architecture decisions and verified outcomes   |   Promising, unproven   |   High   |   Research experiment   |
|   Generate repo-specific adapters from code history   |   Promising for repository familiarity   |   Medium initially, after setup   |   Watch Code2LoRA   |
|   Persistent architecture graph + historical decision retrieval   |   High practical potential   |   Low–medium   |   Best first investment   |
|   Historical commit replay and learned skills   |   High practical potential   |   Medium   |   Best second investment   |
|   Frontier architect + automated experiments   |   High for novel decisions   |   Medium–high   |   Essential for difficult system-level work   |
|   Hybrid memory + trained local specialist + frontier escalation   |   Potentially strongest long-term   |   High   |   Worth testing after baseline works   |

These ratings are engineering assessments, not benchmark-derived probabilities.

### Why I wouldn't train after every session

You could technically perform another LoRA training update after every successful merge.

But success on a single task is a noisy training signal, and continual updates can introduce interference or reinforce an architectural mistake.

I'd instead collect training candidates continuously and retrain only after accumulating a meaningful, validated batch.

Maintain the previous adapter as a rollback point. Evaluate the candidate against both new and older tasks. Promote it only if it performs better without degrading important existing capabilities.

And importantly: do not force a local model to make every architectural decision just because it's specialized. Give it access to the frontier model as a reviewer or consultant.

A local model might be exceptionally familiar with Kites but less capable of recognizing a novel concurrency problem or evaluating a radical architectural redesign.

The strongest combination may be a resident local project expert that prepares context for a frontier architect—not necessarily one that replaces the frontier architect.

## 7. How to find out whether your idea actually works

This is where I would put research effort before spending money on training.

Build a Kites Senior Engineer Benchmark.

Use real historical Kites decisions and future development tasks, splitting them chronologically so the model cannot see future solutions during training.

Measure three separate capabilities:

|   Capability   |   Example test   |   Measurement   |
| --- | --- | --- |
|   Repository understanding   |   Explain why offscreen processing owns a particular state   |   Verified facts, evidence, incorrect assumptions   |
|   Architectural judgment   |   Choose between changing an existing pipeline interface and introducing a new one   |   Constraint compliance, coupling, maintainability, experimental outcomes   |
|   Autonomous planning   |   Independently identify the next significant system-level improvement   |   Relevance, measured product improvement, unnecessary work avoided   |

I'd compare four systems under the same task and resource budgets:

Illustrative research comparison—not measured Kites results

The experiment should compare these four systems rather than assume that fine-tuning will win.

0

25

50

75

100

Frontier baseline

Frontier + memory

Local + memory

Local + memory + LoRA

* Frontier baseline: Illustrative score 50
* Frontier + memory: Illustrative score 65
* Local + memory: Illustrative score 46
* Local + memory + LoRA: Illustrative score 55

Hypothetical values only, illustrating the experimental design. No Kites benchmark scores have been measured.

A valid comparison also needs a fixed model budget, identical tooling, several repeated trials and outcome-based tests rather than only LLM judgments.

The critical question isn't merely whether the fine-tuned model answers more repository trivia correctly.

It's whether it makes better decisions about previously unseen Kites engineering situations, with fewer human corrections, fewer architecture regressions and lower total cost.

For longer-term evaluation, [SWE-CI](https://arxiv.org/abs/2603.03823?utm_source=chatgpt.com) and [SWE-Milestone](https://proceedings.mlr.press/v306/deng26d.html?utm_source=chatgpt.com) provide useful ideas for testing how architectural decisions hold up through successive changes, rather than just one isolated PR.

arXiv+1

## 8. The open-source research I'd actually use

|   Project   |   Use it for   |
| --- | --- |
|   [Code2LoRA / c2l-terminal](https://github.com/lilianahotsko/c2l_terminal?utm_source=chatgpt.com)   |   Experiment with generating repo-specific weights; prototype currently centers on completion and repository Q&A   |
|   [Learning to Commit](https://github.com/LearningToCommit/LearningToCommit?utm_source=chatgpt.com)   |   Learn from historical repository changes without weight training   |
|   [SPADE / RIG](https://github.com/Greenfuze/Spade?utm_source=chatgpt.com)   |   Architectural graph ideas; adapt its extraction concepts to Kites   |
|   [SWE-QA-Pro](https://github.com/TIGER-AI-Lab/SWE-QA-Pro?utm_source=chatgpt.com)   |   Train and evaluate tool-assisted repository understanding   |
|   [Prism](https://github.com/WhiteFlamesCN/Prism-Opencode?utm_source=chatgpt.com)   |   Reduce duplicated reading through persistent, identifier-grounded file memory   |
|   [SWE-Skills-Bench](https://github.com/GeniusHTX/SWE-Skills-Bench?utm_source=chatgpt.com)   |   Check whether learned skills actually improve software-engineering outcomes   |

A caution on skills: SWE-Skills-Bench's March 2026 preprint found that 39 of 49 evaluated general-purpose skills produced no pass-rate improvement, with some making performance worse. That's another reason to learn Kites-specific, evidence-backed skills, not simply accumulate an ever-growing generic rule collection.

arXiv

Also, Code2LoRA's publicly verified terminal repository is `lilianahotsko/c2l_terminal` (underscore), which corrects the link I gave earlier.

## 9. What we can actually conclude from the research

Repo-specific fine-tuning works for some concrete tasks.

Industrial experiments and Code2LoRA show useful gains in project-specific completion and code familiarity.

External experience learning already provides measurable benefits without retraining.

Historical-commit memory, architecture graphs and precise retrieval can reduce repeated exploration and improve repo-specific decisions.

A continually trained, single-repository AI that reliably develops senior-engineer-level architectural judgment has not been demonstrated by the research I found.

That's the precise gap your idea could target.

### My final recommendation for Kites

Start with a frontier architect that learns from Kites's historical decisions through structured, persistent experience, not by changing its weights. Couple that with a continuously maintained code graph and autonomous experiments.

This directly attacks the "new intern every session" problem and allows you to validate whether the project-specific knowledge is actually useful.

Once you have enough high-quality examples of architectural decisions and their outcomes, introduce a small local model with a Kites-specific LoRA. Compare it against the memory-only system on future engineering decisions. If it wins, promote it to a resident project-expert role.

If it doesn't, you've still built the valuable part: the system that enables each new frontier agent to inherit project-specific engineering experience.

The most promising research direction isn't just repository-specific fine-tuning. It's repository-specific continual learning with verifiable feedback—where the system accumulates not only facts about Kites, but knowledge of which architectural decisions actually worked and why.

That is the closest technical approximation I can identify to your idea of an engineer gradually becoming senior in one company, on one codebase, without needing to turn the underlying AI into a generally smarter model.

* * *

**You:**

1 selection
one problem is that this benchmark is compare the Qwen2.5-Coder-1.5B orginal vs Qwen2.5-Coder-1.5B finetuned it is kinda obvious Qwen2.5-Coder-1.5B finetuned will win that is what finetune is for but the question is that we use the small model like Qwen2.5-Coder-1.5B only for system thinking as i mean we can use big one but that would require a freaking datacenter for just a repo so not plausible 
so my architect is Qwen2.5-Coder-1.5B fintuned do the system thing, promt ( like when i manually prompt the model to do task, this is what automate myself part) -> the big model via api to fix bug, find the problem, find solution, implement feature,... normally, i mean it automate like myself like literally what i am doing right now like i am prompt you the architect to do this, i mean you do all the reserach and suggest anyway but like if without me you never reserach, compose all these together at first, but that is the part left unautomate is that i still have you prompt you, so the real question is 
will  Qwen2.5-Coder-1.5B fintuned as sytem thinker -> prompt large model is better than large model as system thinker ( no finetune just api call) -> prompt large model-same model ( the normal everyone use if try to automate the system thinker) as large model is by default is more intelligent so will a small but fine tune is better at the system thinker ? or finetune it self technique is not build for this and this wont work that is the real question

* * *

**ChatGPT:**

# Can a repo-trained 1.5B AI manager outperform a frontier AI manager?

My prediction: A fine-tuned 1.5B model could outperform a frontier model at repetitive, highly project-specific management decisions. But I would expect the frontier model to remain better at novel architectural reasoning, even if the 1.5B model has been trained extensively on Kites.

The key is that you're comparing two complete systems, not two models' coding ability.

## 1. The exact comparison you're proposing

A — Your idea

Local 1.5B manager

Continually fine-tuned on Kites

Discovers tasks, designs plans, delegates work

Frontier coding agent via API

B — Conventional approach

Frontier AI manager

Not fine-tuned on Kites

Discovers tasks, designs plans, delegates work

Same frontier coding agent via API

Both use the same codebase, tools, automated tests and execution budget. Only the manager differs.

For a scientifically fair comparison, both managers must also have access to the same persistent project memory and code-search tools. Otherwise, you would mostly be measuring whether one model has project knowledge and the other doesn't, rather than whether fine-tuning is the better way to acquire it.

## 2. What the research actually says

The most relevant research isn't Code2LoRA, because its benchmark measures repository-specific code completion, not autonomous engineering management.

I found two experiments much closer to your actual design.

[ParaManager — Small Model as Master Orchestrator](https://arxiv.org/abs/2604.17009?utm_source=chatgpt.com)

April 2026 · Trained Qwen3-4B orchestrating larger models

Researchers trained a 4B model to decompose tasks, select larger specialist models, execute subtasks in parallel, process feedback and decide what to do next.

Best compared serial orchestration: 66.21%

Trained 4B ParaManager: 70.48%

Average accuracy across eight reasoning, knowledge and coding benchmarks, under the authors' evaluation protocol.

arXiv

This is evidence that a small, specially trained manager can orchestrate larger models effectively—even outperform several established orchestration approaches.

However, the manager wasn't trained on a single repository, the benchmarks weren't long-term software maintenance, and training included reinforcement learning on substantial compute.

[Planner Fine-Tuning on Synthetic Agent Trajectories](https://krasserm.github.io/2024/05/31/planner-fine-tuning/?utm_source=chatgpt.com)

2024 · Fine-tuned Mistral-7B versus GPT-4 planner

This experiment explicitly separated planning from execution and trained a smaller model on plans produced by GPT-4.

GPT-4 planner: 91%

Fine-tuned 7B planner: 89%

Average pass rate on a small test set of 50 requests, not real software-architecture tasks.

Martin Krasser

The important finding is that training a small model specifically to choose and formulate the next task can make it approach the performance of a much larger general planner, at least in a constrained environment.

These are encouraging results for your architecture. But neither demonstrates that a 1.5B model trained on one evolving repository can surpass a frontier model at deciding how that product should evolve.

## 3. Why fine-tuning might help—and where it probably won't

There's a crucial difference between teaching a model what decisions usually work in Kites and teaching it how to invent a good solution to a new architectural problem.

|   Manager responsibility   |   Can a repo-trained 1.5B outperform a frontier model?   |   My expectation   |
| --- | --- | --- |
|   Remember which component owns a feature   |   Yes, potentially   |   Fine-tuning or precise retrieval can supply an advantage   |
|   Recognize recurring architectural mistakes   |   Yes, potentially   |   Strong candidate for specialization   |
|   Choose the next task from an existing backlog   |   Possibly   |   Good fit for a trained small planner   |
|   Decide which specialist agent to call   |   Possibly   |   Specialized orchestration training can help   |
|   Discover a subtle new architectural weakness   |   Unlikely to outperform consistently   |   Frontier reasoning has the advantage   |
|   Design an entirely new subsystem   |   Unlikely   |   Frontier reasoning has the advantage   |
|   Decide whether the entire architecture needs rethinking   |   Very unlikely   |   Requires substantial reasoning and uncertainty handling   |
|   Evaluate whether Kites is becoming a better product   |   Not reliably on its own   |   Requires product evidence, evaluation and judgment   |

These are predictions, not measured Kites results.

### A useful additional study

The [Routine](https://arxiv.org/abs/2507.14447?utm_source=chatgpt.com) study trained Qwen3-14B for specific enterprise workflows.

The authors reported that a domain-specialized 14B model reached 95.5% execution accuracy, approaching GPT-4o's 96.3% when using their structured workflow framework.

arXiv

That is compelling evidence for small-to-medium specialist models approaching larger models on well-defined organizational procedures.

But think about the nature of those tasks: the system is learning to execute established procedures correctly.

Your goal goes further. The manager must sometimes discover that the established procedure itself is wrong.

That is where I would expect the frontier model to retain an advantage.

## 4. The key distinction: don't fine-tune the 1.5B model to know all the code. Train it to manage Kites intelligently.

This is the most important modification I would make to your idea.

Code2LoRA's own documentation explicitly describes its Qwen2.5-Coder-1.5B system primarily as a repository-adapted code-completion model, not an autonomous conversational manager.

PyPI

You need different training data.

Example: one Kites engineering-management training sample

YAML

```
project: kites

observed_state:
  - OCR accuracy acceptable
  - typesetting failures increased
  - rendering module changed recently
  - 12 regression fixtures failing

historical_knowledge:
  - renderer owns text placement
  - OCR should not modify layout geometry
  - previous global refactor caused regressions

expected_manager_action:
  action: launch_investigation
  specialist: frontier_architect

  task: >
    Identify the root cause of the new
    typesetting regressions. Examine the
    renderer changes, compare failing
    fixtures, and propose the safest
    architectural correction.

  acceptance:
    - explain root cause
    - preserve OCR interface contract
    - pass existing visual regressions
    - measure latency impact

expected_followup:
  - review findings
  - assign implementation
  - verify results
  - update project memory
```

Illustrative training sample, not an actual Kites incident.

The small model learns to recognize a situation, understand project constraints, choose the next valuable action, and brief the stronger model correctly.

It doesn't need to solve every architectural problem itself.

But it must know when a situation calls for deeper architectural reasoning. That is itself a difficult skill, so escalation rules and independent review should not rely solely on the 1.5B model's confidence.

## 5. The architecture I would choose instead of either extreme

I would use a hybrid manager with the small repo-specialized model in charge of routine coordination, while delegating genuinely difficult system thinking to a frontier architect.

Automatic triggers

New commits · Failed tests · Product gaps · User feedback · Scheduled architecture reviews

Local Kites-specialized manager

Fine-tuned on past decisions + current repository memory

Known situation

Prepare task, select worker, monitor execution

Novel / high-impact problem

Request frontier architectural analysis and review

Frontier research / implementation / QA agents

Investigate, design, implement, test, return evidence

Durable learning system

Update project history, architectural decisions, lessons, and future training examples

Automatically evaluate the next opportunity

This is importantly not a frontier model acting as the manager all the time.

Your local model can remain the resident coordinator that accumulates Kites-specific habits and operates cheaply.

But when Kites needs an original architectural decision, it can request a frontier analysis, obtain alternative designs, commission experiments, and learn from the observed outcome.

The system therefore automates your prompting role without requiring the small model to be equally intelligent across every kind of problem.

### Why I prefer this design

The risk of a weak implementation agent is that it writes bad code. Your tests may catch that.

The risk of a weak engineering manager is much more serious: it might never decide to investigate the right problem.

Imagine Kites's entire OCR pipeline has a fundamental design flaw.

A weak manager might continuously assign tasks to optimize individual functions, fix minor UI bugs, and add more OCR models.

All the assigned tasks could pass their tests.

But the system would keep improving the wrong architecture because the manager never recognized the deeper problem.

A strong architect can potentially recognize that mistake. A 1.5B model trained mainly on historical decisions might instead learn to preserve the existing design.

That's why I would schedule independent frontier-level architecture reviews even when the small manager believes everything is fine.

## 6. How I would run the decisive experiment

You don't need to build the entire autonomous organization before answering your question.

Use three configurations:

|   Configuration   |   Manager   |   Coding agents   |
| --- | --- | --- |
|   A   |   Frontier model + repository memory   |   Same frontier model   |
|   B   |   Fine-tuned 1.5B + same repository memory   |   Same frontier model   |
|   C   |   Fine-tuned 1.5B + memory + frontier escalation   |   Same frontier model   |

Give all three identical historical Kites project states. Hide what actually happened afterward.

For each state, ask the manager to independently choose what the engineering organization should investigate or implement next. Let its assigned coding agents complete the work.

Then compare actual project outcomes, not how convincingly the managers describe their plans.

I would measure these four metrics:

1. Task selection quality: Did the manager identify an important problem rather than invent unnecessary work?
2. Architectural correctness: Did its decisions preserve existing constraints and avoid future regressions?
3. Autonomous improvement: Did Kites's measured product quality actually improve without a human supplying the specific task?
4. Total cost: Training, local inference, API calls, failed tasks and repeated debugging—not merely manager-token costs.

Train on older Kites sessions and test against later, held-out sessions. Include cases where developers rejected an initially plausible architectural decision.

I would also compare a small instruction-tuned planner in the roughly 3B–4B range before committing to Qwen2.5-Coder-1.5B. ParaManager's demonstrated 4B orchestration results make that size more evidence-supported for this role, although they don't prove repo-specific superiority.

arXiv

## 7. My final prediction

|   Comparison   |   Which I would expect to win   |
| --- | --- |
|   1.5B repo-trained vs frontier with no repo memory, for familiar repo-specific procedures   |   Could be 1.5B   |
|   1.5B repo-trained vs frontier with equally good project memory, for familiar procedures   |   Close; must measure   |
|   1.5B repo-trained vs frontier with memory, for novel system design   |   Frontier   |
|   Hybrid small manager + frontier architect vs small manager alone   |   Hybrid   |
|   Hybrid vs always-frontier manager, on total cost   |   Hybrid may win if routine coordination is frequent   |
|   Hybrid vs always-frontier manager, on architectural quality   |   Not established; requires direct testing   |

One final economic consideration: if frontier coding agents consume most of your API budget and the manager only makes a few decisions per day, replacing that manager with a local 1.5B model might save relatively little money. If the manager performs hundreds of classification, monitoring and delegation decisions daily, the economics become more attractive.

So my answer is: fine-tuning is suitable for your idea, but I would not bet on a repo-trained 1.5B becoming a better overall engineering architect than a frontier model with equally good memory.

I would bet that a repo-specialized small model can become a useful autonomous coordinator that knows Kites's conventions, recognizes familiar problems, creates well-scoped tasks, and knows when to recruit stronger reasoning.

That's the experiment I'd pursue: train the small model to become an excellent Kites engineering manager, not to replace the frontier model's intelligence. The manager supplies continuity and initiative; the frontier model supplies deep reasoning; persistent project evidence lets both improve their decisions over time.

* * *

**You:**

1 selection
make sure to check the benchmark it is Local 1.5B manager ->large vs Local 1.5B manager finetune -> large (which is not what we looking for and it is obvious) or it is like our Local 1.5B manager fintune -> large vs large -> large

* * *

**ChatGPT:**

I checked the actual [ParaManager paper](https://arxiv.org/html/2604.17009v1?utm_source=chatgpt.com), including its benchmark table, evaluation setup, and ablations.

Result: It does NOT directly test your exact comparison.

The paper evaluates a trained Qwen3-4B manager orchestrating larger models against several baselines, but it does not include a controlled test of:

Fine-tuned 4B manager

Large worker models

vs.

Unmodified large manager

Same large worker models

## What the reported 70.48% actually compares

|   System   |   Average accuracy   |
| --- | --- |
|   Qwen3-4B, untrained, using tools   |   56.67%   |
|   ParaManager-4B, SFT only, orchestrating larger models   |   63.43%   |
|   ToolOrchestra, trained serial orchestrator   |   66.21%   |
|   GPT-OSS-20B, majority voting (no manager-worker hierarchy)   |   66.88%   |
|   ParaManager-4B, SFT + RL, orchestrating larger models   |   70.48%   |

arXiv

The 66.21% result is from ToolOrchestra, another learned lightweight orchestration approach—not an unmodified frontier model serving as manager.

So my earlier description was too favorable to your hypothesis. ParaManager demonstrates that a small, specialized orchestrator can be effective, but 70.48% versus 66.21% is not evidence that a trained small manager beats an untrained large manager when both delegate to identical workers.

## What the paper actually establishes

The researchers trained Qwen3-4B using supervised fine-tuning followed by reinforcement learning. Its worker pool included Qwen3-30B-A3B, Qwen3-Coder-30B-A3B, and GPT-OSS-20B. They used the same worker pool and tool suite for the orchestration baselines.

arXiv

However, the comparisons mix different factors:

* Training effect: SFT versus SFT + RL.
* Architecture effect: Serial versus parallel delegation.
* Manager choice: ParaManager versus other learned orchestrators.
* Single-model comparison: Large models answering directly versus ParaManager delegating to large models.

They did not isolate your desired variable: small repo-trained manager versus unmodified large manager, holding the workers, tools, workflow and project knowledge constant.

The paper also did not train the manager on one repository or test long-term software architecture decisions.

### Verdict

ParaManager does not answer your research question.

It supports the feasibility of small-model orchestration, but not the claim that a specialized small model can outperform a general frontier model at managing the same coding agents.

Your ideal benchmark remains:

Repo-fine-tuned 1.5B manager → frontier workers versus unmodified frontier manager → identical frontier workers, with both managers having access to the same repository evidence.

I would exclude ParaManager's 70.48% result as direct evidence for that hypothesis.

* * *

**You:**

i though ParaManager-4B, SFT only, orchestrating larger models

63.43% vs

|  |
| --- |

ParaManager-4B, SFT + RL, orchestrating larger models

|  |
| --- |

70.48% is already what we talking or sht ? or may be SFT or sth i dont understand here?

* * *

**ChatGPT:**

Yes, both use a fine-tuned small model as the manager, which then delegates to larger models. The difference is how the small manager was trained.

* SFT (Supervised Fine-Tuning): Train the 4B manager using examples of good orchestration decisions.
* RL (Reinforcement Learning): Further train that same manager using rewards based on how well its decisions work.

|   Configuration   |   Accuracy   |
| --- | --- |
|   4B manager trained with SFT → Large workers   |   63.43%   |
|   4B manager trained with SFT + RL → Same large workers   |   70.48%   |

So adding RL improved performance by 7.05 percentage points.

But your original question is different:

|   Comparison you want   |   Tested?   |
| --- | --- |
|   Fine-tuned small manager → Large workers   |   Yes   |
|   Unmodified frontier manager → Same large workers   |   No   |
|   Compare those two systems directly   |   No   |

What ParaManager proves: Training a small model to manage larger models can improve overall performance.

What it doesn't prove: A fine-tuned small manager performs better than a much smarter frontier manager doing the same job.

And importantly, ParaManager's 4B was trained for general orchestration, not to gradually become an expert on one specific repository like Kites.

So the research supports your architecture's feasibility, but we still don't know which manager would win your exact comparison.

* * *

**You:**

ok whatever find reserach, or repo that actaully match the my comparison or like solve same issue with better/same or different appraoch

* * *

**ChatGPT:**

# Research findings: I found a study that actually tests your comparison

The strongest match is NVIDIA's ToolOrchestra. Unlike ParaManager, it explicitly compares a trained small AI manager against unmodified frontier models acting as managers, with access to the same tools and larger expert models.

That's much closer to your question:

Can a specialized small model make better decisions about which tasks to delegate to powerful models than a generally smarter frontier model?

The answer from this study is yes, on the evaluated tasks. But it doesn't yet establish the same result for a 1.5B model learning one repository over months.

## 1. ToolOrchestra — closest head-to-head comparison

Direct manager comparison

ICML 2026 · NVIDIA Research · Open source

[GitHub repository, training code and checkpoints](https://github.com/NVlabs/ToolOrchestra?utm_source=chatgpt.com) · [Research paper](https://arxiv.org/abs/2511.21689?utm_source=chatgpt.com)

NVIDIA trained a Qwen3-8B-based orchestrator to select external models and tools using reinforcement learning. The available model tools include powerful models such as GPT-5 and Claude Opus 4.1.

They then tested both the trained 8B and unmodified frontier-model orchestrators with the same tool categories and model pool.

NVIDIA Technical Blog+1

Trained 8B manager

Expert LLMs + tools

Unmodified GPT-5 manager

Same expert LLMs + tools

Results with expert models and tools available

|   Benchmark   |   Trained 8B manager   |   GPT-5 manager   |
| --- | --- | --- |
|   Humanity's Last Exam   |   37.1%   |   21.2%   |
|   FRAMES   |   76.3%   |   57.5%   |
|   τ²-Bench   |   80.2%   |   62.3%   |

Authors' results from NVIDIA's Table 1. These compare the respective managers with access to a shared tool/model environment; they are not standalone-model scores.

NVIDIA Technical Blog

This is evidence that training can make a smaller model better at orchestration than a frontier model prompted to orchestrate, rather than merely better than its own untrained version.

The caveats are important: this is an 8B model, not a 1.5B model; training targets general orchestration, not a specific codebase; and the benchmarks measure agentic problem-solving, not autonomous architectural evolution of a software project.

Still, it's the most directly relevant controlled comparison I've found for your manager-versus-manager hypothesis.

## 2. ScribeAgent — another controlled small-plus-large comparison

2024–2025 research · Qwen2-7B fine-tuned · Open-source implementation

[GitHub](https://github.com/colonylabs/ScribeAgent?utm_source=chatgpt.com) · [Paper](https://arxiv.org/abs/2411.15004?utm_source=chatgpt.com)

This experiment is particularly useful because the researchers explicitly replaced their specialized small model with GPT-4o to isolate its contribution.

They trained a 7B model on real-world browser workflows. The model chooses the next browser action, while GPT-4o handles supporting tasks such as refining objectives, mapping actions into the browser environment, and judging completion.

WebArena end-to-end task success

GPT-4o in all stages: 34.2%

Fine-tuned 7B + GPT-4o: 51.3%

Table 8, ScribeAgent paper, evaluated on WebArena. The 7B model generates actions; it is not a coding-team manager.

Qeios: +1

This is another real example of a smaller specialized model making better decisions inside a larger-model-supported system than using the larger model throughout.

However, the small model was trained on roughly six billion tokens of web workflow data. That's dramatically more specialized training data than a single repository's development history is likely to provide.

And it selects browser actions, not architectural goals or which engineering projects to initiate.

Verdict: Strong evidence that specialization can beat general intelligence in a narrow decision-making role. Not yet proof of your proposed autonomous Kites architect.

## 3. The best alternatives that don't require fine-tuning

These projects address the same underlying problem from different directions.

|   Project   |   What it changes   |   Verified improvement   |   What it doesn't solve   |
| --- | --- | --- | --- |
|   [Learning to Commit](https://github.com/LearningToCommit/LearningToCommit?utm_source=chatgpt.com)   |   Learns one repository's engineering habits and architecture constraints from commit history   |   Claude Opus 4.6: 48% → 56% test pass rate on a 50-task SWE-bench Pro subset   |   Doesn't choose new product goals   |
|   [RHO / retro-harness](https://github.com/wbopan/retro-harness?utm_source=chatgpt.com)   |   Automatically improves agent skills, tools, and workflows from past execution traces   |   59% → 78% on SWE-bench Pro in the authors' experiment   |   Doesn't establish autonomous product management   |
|   [Agentic Context Engineering (ACE)](https://github.com/ace-agent/ace?utm_source=chatgpt.com)   |   Continually learns an evolving playbook, without weight updates   |   Authors report +10.6% average improvement on agent benchmarks   |   Not specifically a software architect   |
|   [AFlow](https://github.com/XiangJinyu/AFlow_?utm_source=chatgpt.com)   |   Automatically searches and improves multi-agent workflow structures   |   Authors report +5.7% average improvement across six benchmarks   |   Requires measurable tasks and evaluations   |

GitHub+3

For your case, the particularly interesting distinction is:

Learning to Commit learns how Kites has historically been engineered. RHO and AFlow learn how to improve the agents and workflows that engineer Kites.

These are complementary.

### A newer result worth watching: Stratum

The October 26, 2026 preprint [Stratum: Repository Memory for Coding Agents Beyond the Context Window](https://arxiv.org/abs/2610.36153?utm_source=chatgpt.com) directly investigates the problem of agents losing repository knowledge between sessions.

Its researchers report that agents receiving experience accumulated by earlier agents identified the correct root-cause file in 21 of 24 trials, compared with 6 of 24 using retrieval without that experience, at 4.5 times lower median token cost.

That's a strong effect in a small experiment involving eight real bugs—not a validated general solution to architectural planning.

arXiv

It supports an important idea: you can improve a new agent's effective project familiarity substantially without putting that familiarity into model weights.

## 4. The research exposing the remaining problem: who decides to start work?

This is important because your proposed small manager isn't just an orchestrator. It's supposed to replace you deciding that Kites needs another investigation in the first place.

Two particularly recent studies investigate that exact gap.

[SWEeper-Bench](https://github.com/zlab-princeton/sweeper-bench?utm_source=chatgpt.com) — Princeton, October 2026

Agents receive a repository and a broad instruction to find and fix user-facing bugs. They aren't told exactly which interaction is broken.

Must discover bug: 59%

Given bug description

# ~96%

Best reported frontier-agent results on this benchmark.

GitHub: +1

This shows just how much difficulty comes from discovering what to work on, independently of implementing the fix.

[Agentic Coding Needs Proactivity, Not Just Autonomy](https://research.google/pubs/agentic-coding-needs-proactivity-not-just-autonomy/?utm_source=chatgpt.com) — Google Research, 2026

This paper identifies the missing capability as an insight policy: the system must decide what matters next, gather supporting evidence, determine whether action is warranted, and learn from the outcome.

It proposes evaluating decision quality, contextual grounding, and learning improvement—not just task completion. It's a conceptual framework rather than a demonstrated solution.

research.google

This distinction is critical for the question you're researching.

A 1.5B model fine-tuned on thousands of Kites architectural decisions might become very good at predicting what an experienced engineer would do in a familiar situation.

But to replace your initiative, it also needs continuous signals about the product: tests, usage failures, benchmarks, changes to dependencies, uninvestigated workflows, and opportunities for improvement.

That requires a running observation-and-planning system regardless of model size or whether the manager is fine-tuned.

## 5. So which research solves which part of your idea?

|   Research   |   Small specialist beats big generalist?   |   Learns one codebase?   |   Learns over time without weight training?   |   Can autonomously discover what to do?   |
| --- | --- | --- | --- | --- |
|   ToolOrchestra   |   Yes, in orchestration benchmarks   |   No   |   No   |   Within a given task   |
|   ScribeAgent   |   Yes, in browser workflow tasks   |   No   |   No   |   Chooses next browser action   |
|   Learning to Commit   |   Not its comparison   |   Yes   |   Yes   |   No; starts with assigned task   |
|   RHO   |   Not its comparison   |   Can adapt to project traces   |   Yes   |   Improves agent workflow, not product goals   |
|   ACE   |   Some favorable specialized-agent comparisons   |   Can maintain project-specific playbooks   |   Yes   |   Only with a surrounding agent loop   |
|   SWEeper-Bench   |   No, benchmark rather than training method   |   Evaluates repository-specific work   |   No   |   Yes, but substantial failures remain   |

The research supports the individual pieces of your proposed system, but I did not find a validated experiment that combines all of them:

A continually repo-trained 1.5B manager that independently identifies worthwhile software work and beats a frontier manager with equal repository memory, while both control the same frontier coding agents.

That exact claim remains unproven.

## 6. What I'd build based on these findings

I would not begin with continual LoRA training. I'd start with an architecture that can test whether LoRA is actually necessary.

Automatic observations

CI failures · Browser tests · Performance regressions · User feedback · Unexplored feature states · Periodic architecture audits

Resident project manager

Initially frontier API + persistent project knowledge; later test a repo-trained local 1.5B/4B alternative

Project learning system

Learning to Commit + ACE-style lessons + architectural history + code graph

Frontier workers via API

Investigate · Design · Implement · Test · Review

Independent evaluation

Did the selected task actually improve Kites? Did it introduce regressions? Was it worth doing?

Outcomes update project knowledge and the next manager decision

The most important part is the manager's output, which I'd make structured:

JSON

```
{
  "proposed_action": "investigate_architecture",
  "problem": "typesetting regressions increasing",
  "evidence": ["eval-run-187", "commit-diff-42"],
  "why_now": "failure rate exceeds quality threshold",
  "delegate_to": "frontier_architect",
  "objective": "Determine whether layout ownership is incorrect",
  "acceptance": "Reproduce failures and compare solutions",
  "priority": "high"
}
```

This makes the manager's judgment measurable.

The system can then compare a proposed task with its eventual outcome and learn whether the decision was worthwhile.

### The decisive experiment: four manager configurations

Keep the same coding agents, codebase, memory and test environment.

|   Configuration   |   Manager   |   What it isolates   |
| --- | --- | --- |
|   A   |   Frontier model + repo memory   |   Strong general intelligence with accumulated project knowledge   |
|   B   |   Local 1.5B + repo memory   |   Cost and capability of the untrained small manager   |
|   C   |   Repo-fine-tuned 1.5B + repo memory   |   Whether specialization makes the small model outperform A   |
|   D   |   Repo-fine-tuned small manager + selective frontier consultation   |   Whether a hybrid preserves quality at lower cost   |

For each historical Kites state, hide future commits and ask the manager what engineering work should be initiated. Have the same frontier workers execute its tasks.

Measure:

* Useful-work discovery: Does the manager identify important issues rather than generating endless low-value tasks?
* Architecture outcomes: Do decisions reduce coupling, preserve constraints, and survive subsequent changes?
* Total cost: Include local training, failed investigations, frontier calls and repeated work.
* Human intervention: How frequently must you correct the manager's priorities or architecture decisions?

This is the benchmark that would actually test your hypothesis, rather than simply demonstrating that fine-tuning improved a smaller model's coding benchmark score.

## 7. Which repositories are worth investigating first?

[NVlabs/ToolOrchestra](https://github.com/NVlabs/ToolOrchestra?utm_source=chatgpt.com)

Best reference for training a small model to make orchestration decisions better than a prompted frontier manager. Includes training/evaluation code and checkpoints; full RL training is more demanding than a simple LoRA experiment.

[LearningToCommit/LearningToCommit](https://github.com/LearningToCommit/LearningToCommit?utm_source=chatgpt.com)

Best reference for extracting project-specific engineering knowledge from Git history. The published code is noncommercially licensed, which matters if you eventually commercialize a derivative.

[wbopan/retro-harness](https://github.com/wbopan/retro-harness?utm_source=chatgpt.com)

Best reference here for automatically improving agent instructions, tools, and skills from prior executions without model training. It includes workflows for Claude Code and Codex.

[ace-agent/ace](https://github.com/ace-agent/ace?utm_source=chatgpt.com)

Best reference for maintaining a continually evolving, structured decision playbook without repeatedly rewriting and losing earlier knowledge.

[zlab-princeton/sweeper-bench](https://github.com/zlab-princeton/sweeper-bench?utm_source=chatgpt.com)

Useful for evaluating whether Kites agents can independently discover user-facing bugs, rather than only repair defects you've already explained.

## Final conclusion

There are now two strong, separate findings:

1. Your small-manager hypothesis has empirical support. ToolOrchestra and ScribeAgent show that a specialized, smaller model can outperform a general-purpose frontier model in particular decision-making roles within a larger AI system. That isn't merely a small fine-tuned model beating its untrained counterpart.

2. Your repo-specific continual-learning hypothesis has empirical support without fine-tuning. Learning to Commit, repository memory research, ACE and RHO demonstrate ways to accumulate engineering knowledge or improve an agent's procedures from historical experience.

What remains unanswered is whether combining both makes a 1.5B Kites-specific model a better autonomous engineering manager than a frontier model with the same project memory.

The most promising direction to test is therefore:

Project-specific accumulated experience + automatic discovery of work + a small specialized orchestration model + frontier coding workers.

Fine-tuning is one possible way to improve the manager. But the more fundamental innovation is giving the organization a reliable way to learn which engineering decisions were worthwhile and use that evidence to decide what to do next, without requiring you to initiate every task.

That is much closer to automating your role as the experienced developer than simply automating code generation.

* * *

**You:**

![User attachment](blob:https://chatgpt.com/87501331-be57-40e6-9842-3fd83de9067d)

this one is like benchmark and fine tune on a specific repo or sth? or like tool use in genera;

* * *

**ChatGPT:**

ToolOrchestra is fine-tuned for general tool and model orchestration, NOT for a specific repository.

It trains an 8B model to decide which tools and larger AI models to call, how to combine their results, and when to make additional calls.

GitHub+1

### What exactly does it learn?

For example, a user asks a complex question. The trained 8B manager learns to:

1. Decide whether it needs web search, a coding model, a math model, or a general-purpose LLM.
2. Call the appropriate tool or model.
3. Evaluate the returned information.
4. Decide whether more calls are needed.
5. Produce the final answer while optimizing accuracy and cost.

It uses reinforcement learning (RL) with rewards for correctness, efficiency, and tool preferences.

### How does this compare to your Kites idea?

|   Capability   |   ToolOrchestra   |   Your proposed Kites AI   |
| --- | --- | --- |
|   Small, trained manager   |   Yes, 8B   |   Yes, 1.5B–4B   |
|   Delegates to frontier models   |   Yes   |   Yes   |
|   Learns tool selection and orchestration   |   Yes   |   Yes, ideally   |
|   Trained specifically on one repository   |   No   |   Yes   |
|   Continuously learns from that repository's commits   |   No   |   Yes   |
|   Learns architecture and historical design decisions   |   Not its training objective   |   Yes   |
|   Independently decides which product feature to build next   |   Not demonstrated   |   Yes   |
|   Manages an ongoing software-development organization   |   Not demonstrated   |   Yes   |

### What does its benchmark actually prove?

Their trained 8B orchestrator achieved 37.1% on Humanity's Last Exam, compared with 35.1% for GPT-5 in the comparison highlighted by the repository.

GitHub

That's evidence that a smaller model, specially trained to orchestrate powerful models and tools, can outperform a much larger general-purpose system on certain benchmarks.

It does not establish that a small model fine-tuned on Kites would outperform a frontier model at understanding Kites's architecture or autonomously deciding what to develop.

Bottom line: ToolOrchestra addresses the orchestration part of your idea—how a small manager delegates intelligently to powerful models. It doesn't address the repo-specific learning part—how that manager gradually becomes the equivalent of a senior Kites engineer.

Your proposed system would combine these two capabilities, and the second one remains the harder, less validated research problem.

* * *

**You:**

so is there support direct what i got with testing environment like somwhat exact or like exact and use different method is fine i mean this is just propose i not evben sure if fintune small (specific repo)-> large beat  large -> large 
the reson i talking about specific repo as like the example above that small fine tune tool manager is better is kinda obvious but becuase it is general fine tune mean frontieer lab will train the model to choose right tool later anyway so what bother train their own

* * *

**ChatGPT:**

# I found a much closer match: SWE-Spot

The strongest new finding is [SWE-Spot: Building Small Repo-Experts with Repository-Centric Learning](https://github.com/SWE-Spot/swespot?utm_source=chatgpt.com), from Columbia University researchers, updated October 13, 2026.

This paper is almost exactly based on your human-engineer analogy:

> Instead of training a small model on thousands of unrelated programming tasks, train it deeply on one repository so it develops project-specific expertise.

The researchers trained separate 4B-parameter models for specific repositories, using experiences involving software design, implementation, historical changes, and testing.

Their repo-trained 4B models sometimes outperform unmodified models many times larger, including Qwen3-Coder-30B, on tasks within their specialist repositories.

arXiv

## The important benchmark distinction

|   Comparison   |   Did SWE-Spot test it?   |
| --- | --- |
|   Small model trained on one repository vs same small model without repo training   |   Yes   |
|   Small model trained on one repository vs larger general models   |   Yes   |
|   Small model trained on one repository vs general model with comparable context retrieval   |   Yes, through additional ablations   |
|   Repo-trained small manager → frontier coding workers vs frontier manager → identical frontier workers   |   No   |
|   Autonomous decisions about which unrequested product improvements to initiate   |   No   |

So this is the strongest direct evidence I've found for your claim that accumulated repository-specific expertise can compensate for a smaller model's general intelligence.

It doesn't yet establish that such a model would make a better autonomous engineering manager. That distinction will determine which approach is worth adopting for Kites.

## 1. SWE-Spot's actual results

The study used a Qwen3-4B base model and trained it with 8,000 trajectories from each target repository. Its evaluation included held-out future changes in seven repositories. All models used the same mini-SWE-agent evaluation harness.

arXiv

|   Manager/model candidate   |   Execution success   |   Repository Q&A   |
| --- | --- | --- |
| Untrained Qwen3-4B |   3.20%   |   61.79   |
| Qwen3-Coder-30B |   11.56%   |   65.48   |
| SWE-Spot repo-trained 4B |   17.12%   |   78.05   |
| GPT-4.1-mini |   17.85%   |   80.28   |

Execution success is the average across issue resolution, test generation, and feature implementation. Repository Q&A uses a 0–100 judge score. All numbers are the authors' reported averages.

arXiv

This is genuinely encouraging: a 4B model trained deeply on its target repositories outperformed an unmodified 30B model on this suite and approached GPT-4.1-mini.

But it did not beat GPT-4.1-mini overall, and the paper didn't compare it against a current frontier architecture manager. It also let each model perform the engineering task directly, rather than evaluating a manager that delegates to the same powerful worker.

### Two findings that materially change the economics

The authors tested whether repo-specific training merely replaces code retrieval. Providing other models with the correct file/function locations helped, but did not close the performance gap on their Django issue-resolution experiment. That's evidence the specialized model learned something beyond file names.

arXiv

However, they also compared full fine-tuning against LoRA:

Django issue-resolution ablation

0%

7.5%

15%

22.5%

30%

LoRA

Full fine-tuning

* LoRA: Pass rate 17.2%
* Full fine-tuning: Pass rate 24.3%

Same repo-centric training setup, using high-rank LoRA for the adapter baseline.

arXiv

So the cheap version of your proposal—continually updating a tiny LoRA adapter—did not reproduce the full benefit of repository-specific learning in this experiment.

The authors estimate roughly $2,500 to produce one specialized 4B model, primarily because generating the training trajectories requires expensive teacher-model calls. Full fine-tuning itself took about five hours on two H200 GPUs in their setup. Their estimated break-even point was roughly 3,000 tasks against the particular generalist comparison they modeled.

arXiv

That estimate does not transfer directly to your small-manager/frontier-worker setup. A manager that makes only a few decisions per day may take much longer to justify this training expense.

## 2. SWE-CI — the closest existing test environment for your proposed manager → worker architecture

March 2026 · Sun Yat-sen University / Alibaba Group · Open source

[GitHub: SWE-CI](https://github.com/SKYLENAGE-AI/SWE-CI?utm_source=chatgpt.com) · [Paper](https://arxiv.org/abs/2603.03823?utm_source=chatgpt.com)

This is the second major finding. SWE-CI already separates the high-level architect from the programmer, much like the system you described.

Real software repository

Changing requirements · Existing code · Regression tests

Architect model

Examines test results, locates problems, writes high-level requirements and decides what needs fixing

Programmer model

Implements the architect's requirements

CI evaluation

Tests correctness, regression behavior and maintainability across iterations

Feedback returns to architect

The researchers compiled 100 maintenance scenarios from real repositories, with an average evolution span of 233 days and 71 commits. Their benchmark measures whether an agent maintains correctness across successive changes—not merely whether one patch passes.

arXiv+1

This gives you a practical foundation for testing your hypothesis. You could modify the harness to run:

|   Experiment   |   Architect   |   Programmer   |
| --- | --- | --- |
|   A   |   Unmodified frontier LLM   |   Fixed frontier LLM   |
|   B   |   SWE-Spot-style repo-trained 4B   |   Same frontier LLM   |
|   C   |   Frontier LLM + project experience memory   |   Same frontier LLM   |
|   D   |   Repo-trained 4B + same memory   |   Same frontier LLM   |

The research code is public, with evaluation scripts and checkpointing. However, you would need to modify its model routing to assign different models to the architect and programmer roles. This exact four-way experiment isn't included by default.

GitHub

One remaining limitation: SWE-CI gives the architect a test gap to investigate. It doesn't prove the architect can independently recognize an important new product problem that nobody has specified or tested.

## 3. SWEeper-Bench — testing whether your AI independently discovers what to fix

[GitHub: SWEeper-Bench](https://github.com/zlab-princeton/sweeper-bench?utm_source=chatgpt.com) · [Benchmark website](https://sweeperbench.com/?utm_source=chatgpt.com)

This is useful for testing the part of your role that conventional coding benchmarks omit: noticing that something is wrong before anybody has explained the bug.

The benchmark includes 200 real bugs across 200 open-source web applications. Agents receive the codebase, a browser, and a broad instruction to investigate part of the application.

Best agent: discover + fix: 59%

Bug already described

# ~96%

Princeton's reported results. The benchmark checks both that the target bug is fixed and that nearby functionality is preserved.

sweeperbench.com

This makes it a relevant test of autonomous initiative, although the agent still receives a broad area to investigate rather than inventing its entire product roadmap.

For your experiment, the smaller repo-trained manager could decide which workflows to inspect and instruct the same frontier coding agent as the baseline. A separate verifier would judge whether the work actually fixed the hidden issue.

That would be closer to testing whether the trained manager can replace your manual bug-discovery prompts.

## 4. Better or cheaper approaches than fine-tuning

Two other research projects are particularly relevant because they learn from one project's engineering history without needing to create a new set of model weights.

|   Project   |   How it learns   |   What has actually been demonstrated   |
| --- | --- | --- |
|   [Learning to Commit](https://github.com/LearningToCommit/LearningToCommit?utm_source=chatgpt.com)   |   Replays historical repository tasks, compares attempts with real maintainer patches, saves project-specific lessons   |   Claude Opus 4.6 improved from 48% to 56% on a 50-task SWE-bench Pro subset   |
|   [Retrospective Harness Optimization (RHO)](https://github.com/wbopan/retro-harness?utm_source=chatgpt.com)   |   Replays previous agent sessions and improves persistent instructions, tools, and workflows   |   Authors report SWE-bench Pro improvement from 59% to 78% in their tested setup   |

GitHub+1

Learning to Commit is the more direct approach to accumulating project-specific engineering experience. RHO is more about learning to improve the engineering agent's working methods.

Neither demonstrates that an agent can fully autonomously choose good new product directions, and their reported gains should not be extrapolated to your Kites manager.

The key economic difference is that these approaches do not require training a separate model for every repository. You pay for experience extraction and retrieval, rather than full parameter training.

## 5. The experiment that would finally answer your question

I'd combine the ideas into a single controlled experiment on Kites.

Historical Kites development states

Older commits, product goals, tests, bug reports, decisions

A: Frontier manager

Unmodified + project memory

B: Local repo expert

Repo-trained 4B + same memory

Identical frontier coding workers

Same API model, tools, budgets and execution environment

Independent outcome evaluation

Did the manager identify valuable work? Did the code improve? Did regressions occur? What was the total cost?

The essential design is to train the smaller manager only on information available before a selected historical date. Then replay later development states that it hasn't seen.

You want to measure five outcomes:

|   Metric   |   What it answers   |
| --- | --- |
|   Useful task discovery   |   Can the manager notice important problems without you telling it?   |
|   Architectural quality   |   Does it make decisions that respect the actual product and codebase?   |
|   Long-term maintainability   |   Do its decisions survive subsequent features and refactors?   |
|   Human interventions   |   How often must you step in to correct the manager?   |
|   Total cost per useful improvement   |   Does local specialization actually save resources after accounting for training and failed work?   |

SWE-CI provides useful long-horizon architecture and maintenance evaluations. SWEeper-Bench provides hidden user-facing bug-discovery evaluations. SWE-Spot supplies a concrete repository-specific training method.

To evaluate independently inventing valuable product features, you'd still need an additional Kites-specific evaluation based on product objectives and observable user outcomes. None of these benchmarks alone measures that.

## 6. What I would conclude from the available evidence

|   Claim   |   Evidence today   |
| --- | --- |
|   Training deeply on one repository improves a small model's understanding   |   Strong evidence from SWE-Spot   |
|   A repo-trained 4B can outperform a larger unmodified coding model in its repository   |   Demonstrated on the evaluated tasks   |
|   A repo-trained small model beats an unmodified frontier engineering manager with identical workers   |   Not established   |
|   A frontier agent can accumulate repository expertise without fine-tuning   |   Supported by Learning to Commit and repository-memory research   |
|   A system can test architect → programmer decisions across changing requirements   |   Yes, SWE-CI provides an open test environment   |
|   A repo-trained manager can independently discover the most valuable product work   |   Still unproven   |

### The most useful distinction

You made an important point about general tool selection: if the benefit comes from learning universal skills like choosing between web search and a code interpreter, frontier-model developers can eventually incorporate that training themselves.

But a company's particular architecture, historical mistakes, user expectations, and engineering decisions are different. A frontier model provider generally cannot pretrain on all the future private engineering experience of every application.

That is the lasting value of repository-specific learning.

The unresolved question is whether that knowledge should reside in:

* A dedicated small model's weights.
* A persistent, evidence-backed project memory that a frontier model can query.
* Or a combination of the two.

SWE-Spot provides meaningful evidence for the first approach, while Learning to Commit provides evidence for the second. No current result I verified conclusively establishes which produces the better autonomous system-level manager when both control identical frontier coding agents.

For Kites, the decisive next experiment is SWE-Spot-style repo specialization plugged into SWE-CI's architect role, compared against a frontier architect with equivalent project memory.

That would test your original hypothesis rather than merely show that fine-tuning improves code completion or general tool calling.

* * *

**You:**

ok but the size is like 4b vs mini 4.1 ( around 8-16b) but here we talking about small self hose 4b-35b fine tune vs 300b > api caller model as manager this is the whole point like the reason i ask you to find result as like this is expensive reserach to do and like if after we done the reserch and turn out no matter how we fintune we can not beat the cheap api caller anyway compare to self host and finetune which is expensive then like we watse time

* * *

**ChatGPT:**

# The economic case changes the answer substantially

For a single project like Kites, I would not invest in training and self-hosting a 4B–35B architectural manager yet.

Your argument is correct: beating an untrained 4B, a 30B open model, or GPT-4.1-mini doesn't establish that a repo-specialized model is worth using when the alternative is a powerful frontier API.

The actual comparison is:

|  |   Local specialist   |   Frontier API   |
| --- | --- | --- |
|   Manager   |   4B–35B, trained specifically on Kites   |   Frontier model, no repo-specific weight training   |
|   Project knowledge   |   Training + retrieval   |   Same persistent retrieval   |
|   Coding workers   |   Frontier API agents   |   Identical frontier API agents   |
|   Goal   |   Better autonomous engineering decisions   |   Better autonomous engineering decisions   |

I still haven't found a controlled study demonstrating that a 4B–35B model trained on one repository beats a current frontier manager with access to the same project knowledge and identical coding workers.

SWE-Spot is encouraging, but its reported comparisons focus on models such as Qwen3-Coder-30B, GPT-4.1-mini, and GPT-5-nano—not a current top-tier frontier model acting as an architect. Its tests also evaluate engineering task execution rather than an independent manager delegating work.

arXiv+1

## 1. The API is cheaper than you might expect

I checked current API pricing rather than assuming a frontier manager costs hundreds of dollars per day.

Anthropic currently lists these standard token rates.

Claude Platform Docs

|   API manager   |   Input / million   |   Output / million   |
| --- | --- | --- |
|   Claude Sonnet 5.5   |   $2   |   $10   |
|   Claude Opus 5.5   |   $4   |   $20   |
|   Claude Fable 5.1   |   $10   |   $50   |

Suppose your automated engineering manager makes 300 substantial decisions per month, with an average of 20,000 input tokens and 2,000 output tokens per decision.

Estimated monthly manager inference cost

Sonnet 5.5: $18

Opus 5.5: $36

Fable 5.1: $90

Calculated using listed standard API rates; 6 million input and 600,000 output tokens per month. Excludes worker calls, external tools, and retries. Caching can reduce costs.

For perspective, Runpod lists an RTX A5000 24 GB GPU at $0.27/hour, or approximately $194/month if continuously rented, and an A40 48 GB GPU at $0.59/hour, or approximately $425/month. That's before training costs, data generation, system maintenance, and storage.

Runpod

A local model doesn't have to run 24/7, and already owning the hardware changes the economics. But at low managerial call volumes, a frontier API has a significant cost advantage.

## 2. Why SWE-Spot's claimed cost savings don't settle your case

The SWE-Spot authors estimated approximately $2,500 to create one repo-specialized 4B model, mostly spent generating training data with a stronger teacher model. They estimate recovering that investment after about 3,000 engineering tasks.

But read the assumptions: their economic comparison is against running a self-hosted 32B generalist, not paying per call for a frontier API manager.

arXiv+1

That's a fundamentally different business case.

At the Opus 5.5 rate above, one manager decision costs approximately $0.12 under our 20k-input/2k-output assumption.

Illustrative monthly inference cost, Opus 5.5 manager

|   Manager decisions/month   |   API cost   |
| --- | --- |
| 300 | $36 |
| 3,000 | $360 |
| 10,000 | $1,200 |

At $0.12 per call, it takes approximately 20,833 calls just to equal $2,500 in API spending. And that assumes training eliminates every manager API call while local inference, hosting, and maintenance are free.

Of course, if your manager has very long contexts, performs many reasoning steps per decision, or uses a more expensive model, API costs rise. If you run a local model only when needed or already own suitable hardware, hosting costs fall.

But the principle is unchanged: a manager making a few hundred decisions per month is not obviously an economical target for project-specific model training.

## 3. A 35B model doesn't automatically fix the problem

A larger local model might provide better architectural reasoning than a 4B, but it also increases serving requirements, training expense, and the amount of historical training data needed to make specialization worthwhile.

The current research gives us this evidence:

|   Research   |   Small model vs strong model   |   Does it establish your investment case?   |
| --- | --- | --- |
|   SWE-Spot   |   Repo-trained 4B beats some 30B-class models and approaches smaller commercial APIs   |   No, no top-tier frontier manager comparison   |
|   ToolOrchestra   |   Trained 8B beats GPT-5 as orchestrator on some general benchmarks   |   No, not repo-specific or long-term engineering planning   |
|   Learning to Commit   |   Frontier model becomes better at repo-specific tasks using accumulated experience   |   Supports a lower-training-cost alternative   |
|   SWE-CI   |   Evaluates architecture/programming loops across evolving repositories   |   Useful test environment, not proof that a trained local manager wins   |

ToolOrchestra is the strongest counterargument to assuming frontier managers must always win. NVIDIA reports that its trained 8B outperforms GPT-5 with access to the same tool categories on several agentic benchmarks. So specialization can beat general model strength. But the specialized behavior was tool orchestration, not years of architectural judgment about one evolving codebase.

NVIDIA Technical Blog

For your exact Kites setup, the quality advantage remains unproven.

And there's another economic risk: a wrong manager decision costs more than the manager's own inference.

If a specialized manager saves $36 in manager API calls but initiates even a few unnecessary investigations, refactors, or buggy implementation attempts, the stronger coding agents' execution costs can wipe out the savings.

The relevant metric is not price per manager token. It's total cost per verified, useful product improvement, including wasted worker activity and human corrections.

## 4. What I'd use instead: a frontier manager that accumulates Kites-specific experience without fine-tuning

You don't actually need a permanently running local LLM to automate your role.

You need a persistent process that automatically gives a strong model the right information and makes it decide what to do next.

Automatic triggers

Scheduled reviews · New code changes · QA failures · Unexplored product behavior

Persistent Kites knowledge

Architecture graph · Decisions · Past mistakes · Product goals · Previous investigations

Frontier API manager — fresh session

Retrieves relevant context, evaluates project state, independently decides what work is worthwhile

Frontier coding/research/QA workers

Execute selected tasks and return independently verifiable evidence

Experience consolidation

Update the knowledge and decision system automatically

Next event starts another management cycle

This can automate your initiative to start research, assign bugs, identify architectural concerns, and request improvements, while also giving each manager session accumulated knowledge from previous sessions.

The important difference is that a strong model performs the reasoning; the persistent memory supplies project-specific experience.

The [Learning to Commit](https://github.com/LearningToCommit/LearningToCommit?utm_source=chatgpt.com)

It doesn't prove that autonomous system thinking is solved, but it attacks the memory component while retaining frontier-level reasoning.

## 5. My go/no-go decision for your project

Repo-specific 4B–35B manager training

Not justified yet

No verified head-to-head result against a top-tier frontier architect with equal project knowledge and identical workers. Training and maintenance costs could exceed API spending for a single project.

Frontier manager + persistent project intelligence

Best-supported starting point economically. No training pipeline required, and it preserves the option to introduce a local specialist later.

If you still want to investigate local specialization, I'd impose a strict research budget before committing to full training.

First, build a small benchmark from 20–30 historical architectural decisions in Kites. Give an unmodified frontier manager and a local 4B–35B manager the same retrieved project context. Compare their proposed tasks and architecture decisions against known outcomes.

Next, test whether a cheaper 4B–35B model can even perform the management role adequately when supplied with excellent context. Only if it shows promise should you train a small repo-specific adapter on historical decisions and rerun the comparison.

Stop there if the specialized model doesn't demonstrate better useful-work selection or a substantial total-cost advantage. Don't proceed to expensive full fine-tuning merely because LoRA improves its score relative to its own untrained version.

A few dozen evaluation cases won't establish production superiority, but they can cheaply eliminate an obviously weak approach.

### When would repo-specific training become worthwhile?

I'd revisit it if Kites grows into a high-volume, continuously operating AI engineering system; if you manage many related repositories that can share learned behavior; if you already own sufficient GPU capacity; or if the project-specific model demonstrates an improvement that retrieval cannot reproduce.

At that point, the benefit might be quality, not merely cost. If a specialized model consistently recognizes important Kites-specific engineering problems that frontier models overlook, it could justify training even when its inference isn't cheaper.

## Bottom line

You were right to challenge the earlier benchmarks.

There is evidence that small, specialized models can beat larger general models. There is not yet convincing evidence that a locally trained 4B–35B model makes a better long-term architectural manager for one repository than a current frontier API model equipped with the same project history.

For Kites, the economical path is to first automate when the manager works, what project knowledge it receives, what evidence it gathers, and how it learns from outcomes.

That solves much of the repeated-prompting problem without requiring you to train a separate model.

And if future research demonstrates that repo-specific weight updates outperform that system, you can replace the manager model without rebuilding the engineering organization.

I would invest in persistent project intelligence and autonomous management infrastructure now, and treat repo-specific fine-tuning as an experiment requiring evidence before serious spending.

* * *

**You:**

hmm so it still the best way is just the adaptive learning memory system about the repo right? not finetuniong? like as i said model context is just 1m token all it know is just 1m tokenso the memory system context have to be adaptive learning to be so efficient that it can efficiently use that to make the large become hte system thinker in just small liimited mormory ( 1m is just total, usable is usually is just 200k before mnodel start hallucinate on big context)

* * *

**ChatGPT:**

Yes. Based on the research we've discussed, I would prioritize an adaptive, continually learning repository-memory system over fine-tuning a small model.

And your concern about context windows is exactly why the memory system needs to be much smarter than simply saving everything into Markdown files.

The objective is not to make a frontier model read and remember your entire Kites codebase. It's to make a fresh frontier model reason like an engineer who has worked on Kites for years, using only the project knowledge relevant to its current decision.

One correction: 200K tokens isn't a universal point where models begin hallucinating. Effective context capacity depends on the model, task, information placement, and retrieval quality. But treating the full advertised context window as usable, equally reliable memory would be a mistake.

## What the memory system should actually do

Kites development history

Code · Git commits · Design decisions · Failed experiments · Tests · Product feedback

Adaptive learning memory

Continuously updates knowledge, resolves contradictions, tracks dependencies, and learns which memories improve decisions

Product model

What Kites should accomplish

Architecture graph

How components interact

Decision history

Why choices were made

Experience memory

What worked or failed

Task-specific context builder

Selects the minimum sufficient evidence for the current architectural question

Frontier architect — API

Reason · Research · Plan · Delegate · Evaluate

Outcomes update memory for the next session

The critical part is the task-specific context builder. It determines what the model needs to know, rather than giving it a huge history and expecting attention to find everything important.

## The key is to make memory adaptive in two directions

|   Operation   |   What it does   |
| --- | --- |
|   Learning / writing   |   After each verified engineering task, extract new knowledge, correct old assumptions, and store why decisions worked or failed   |
|   Retrieval / reading   |   Before an architectural decision, retrieve relevant knowledge, follow dependencies, and expand into source code only when needed   |

For example, suppose the frontier architect is deciding whether Kites should replace its current OCR pipeline.

It might initially receive a compact briefing of 8,000 tokens containing the product goal, existing pipeline responsibilities, past OCR decisions, measured bottlenecks, and affected components.

If it needs to understand how bubble grouping interacts with recognition, it requests that subsystem's evidence. If it discovers a potentially important dependency involving typesetting, it can expand again.

The model incrementally investigates the codebase rather than loading everything upfront.

A practical initial context budget might be:

|   Context component   |   Starting budget   |
| --- | --- |
|   Product mission and constraints   |   1–2K tokens   |
|   Relevant architecture graph   |   2–5K   |
|   Historical decisions and learned lessons   |   3–8K   |
|   Current task evidence   |   5–15K   |
|   Additional retrieved code   |   On demand   |

These are suggested engineering budgets, not proven optimal numbers.

The model can use additional context when necessary. The goal isn't to impose an arbitrary small limit, but to avoid irrelevant information displacing the facts and reasoning that matter.

## Research supports this direction, with an important warning

The [ACE retrieval experiments](https://ace-agent.github.io/blogs/2026-04-22-ace-retrieval/?utm_source=chatgpt.com) are especially relevant.

Researchers studied adaptive agent playbooks as large as 174K tokens. Retrieval reduced token usage by more than 98%, while preserving approximately 59–65% of the improvement achieved using the complete adapted playbook.

ACE blog website

That's promising for efficiency—but it also tells us something crucial:

Naively retrieving only the top few memories loses important knowledge.

Architectural decisions often depend on relationships between components that aren't obvious from the initial question.

So the Kites memory system should combine:

1. Structured knowledge: Component ownership, dependencies, API contracts, architectural invariants.
2. Experience memory: Previous decisions, unsuccessful approaches, lessons, and evidence.
3. Adaptive retrieval: Select relevant records, expand through dependencies, and verify claims against current code.
4. Continual learning: Update memories based on measured development outcomes, not merely the agent's opinion of its own success.

The first three make knowledge accessible. The fourth makes the knowledge improve over time.

This aligns with [Agentic Context Engineering](https://github.com/ace-agent/ace?utm_source=chatgpt.com), which demonstrated that evolving a structured playbook can improve an agent without updating the underlying model's weights.

Microsoft Research

## One thing I'd add: automatically learn what context was missing

This is especially important for your idea of automating system thinking.

Suppose the architect makes a bad decision because the memory system retrieved everything about OCR accuracy but failed to include typesetting dependencies.

After independent evaluation, the system should identify:

* What important architectural knowledge was absent?
* Was it absent from storage or merely not retrieved?
* What dependency would have led the architect to that knowledge?
* How should future retrieval change for similar decisions?

Then update the memory graph or retrieval rules accordingly.

This is learning how to give the model the right knowledge, not just accumulating more knowledge.

That matters because the retrieval system can itself become more effective with experience.

## The architecture I would settle on

For Kites, at this stage:

Persistent scheduler

Automatically triggers product reviews, architectural investigations, and engineering tasks.

Adaptive project intelligence

Continuously learns project knowledge and constructs compact, evidence-backed context.

Frontier architect

Makes high-level system decisions, identifies unknowns, commissions research and delegates engineering.

Frontier coding and testing agents

Implement, investigate, experiment and produce independently checked outcomes.

This still doesn't guarantee human-level product intuition or autonomous initiative. Those require an observation system, product goals, and reliable ways to determine whether an engineering decision was worthwhile. Memory primarily addresses the continuity and project-knowledge problem.

But yes: rather than training a separate small LLM for every repo, the strongest practical starting point is to make project-specific knowledge persist, evolve, and become selectively accessible to a frontier model.

That gives you two independent advantages: the frontier model retains its general reasoning capabilities, and the project develops an increasingly sophisticated body of knowledge that survives every context reset.

The metric I'd optimize isn't how many tokens the memory system stores or retrieves. It's how often a fresh architect makes the right Kites-specific decision without needing you to explain the project's history or intervene.

* * *

**You:**

currently what the best memory system, self adaptive learning to the repo currently on the market?

* * *

**ChatGPT:**

# Best adaptive memory systems for AI coding agents — November 2026

For your specific goal—making a frontier AI gradually acquire the project-specific understanding of a senior Kites engineer without fine-tuning—I found three particularly relevant options:

* [Hindsight](https://github.com/vectorize-io/hindsight?utm_source=chatgpt.com): Strongest candidate for a ready-made, learning-oriented repository memory system. It automatically ingests Git history and coding sessions, maintains project knowledge, and supports reflective retrieval. It even lists ZCode among its integrations.
* [ai-memory](https://github.com/akitaonrails/ai-memory?utm_source=chatgpt.com): Particularly interesting for self-improvement. It captures coding sessions, builds a versioned knowledge wiki, and can periodically propose and apply evidence-backed corrections to its own stored knowledge.
* [claude-mem](https://github.com/thedotmack/claude-mem?utm_source=chatgpt.com): A popular, established option for automatically recording development sessions and retrieving relevant information later, with relatively low context overhead.

Their documentation confirms these capabilities.

GitHub+2

My leading candidate for Kites is Hindsight, with ai-memory as the most interesting alternative. But there is an important distinction between having excellent recall and actually learning architectural judgment. No trustworthy head-to-head benchmark I found proves that any of these makes a frontier model a reliably autonomous senior engineer.

## 1. Comparison: which tools actually fit your goal?

|   System   |   What it learns automatically   |   Main limitation   |   Fit for Kites   |
| --- | --- | --- | --- |
|   [Hindsight](https://github.com/vectorize-io/hindsight?utm_source=chatgpt.com)   |   Git history, past sessions, facts, inferred observations, evolving knowledge pages   |   Needs a memory backend and model-powered processing; not a full code graph   |   Excellent   |
|   [ai-memory](https://github.com/akitaonrails/ai-memory?utm_source=chatgpt.com)   |   Session experience, mistakes, rules, decisions; scheduled self-improvement of memory pages   |   Doesn't natively ingest Git history; uses an LLM for deeper consolidation   |   Excellent   |
|   [claude-mem](https://github.com/thedotmack/claude-mem?utm_source=chatgpt.com)   |   Coding-session observations and summaries   |   Stronger at remembering work than learning an evolving architecture   |   Good   |
|   [Repowise](https://github.com/repowise-dev/repowise?utm_source=chatgpt.com)   |   Code dependencies, Git co-changes, architectural decisions, documentation and change risks   |   Primarily a repository intelligence/indexing system, not conversational experiential memory   |   Excellent complement   |
|   [Graphiti](https://github.com/getzep/graphiti?utm_source=chatgpt.com)   |   Temporal relationships, new facts, superseded knowledge   |   Requires substantial customization for repository engineering   |   Good for custom systems   |
|   [Learning to Commit](https://github.com/LearningToCommit/LearningToCommit?utm_source=chatgpt.com)   |   Project-specific engineering habits from historical commits   |   Research workflow, not a turnkey always-on memory plugin   |   Promising research   |

GitHub+5

The most important distinction: Hindsight and ai-memory learn what happened during development; Repowise maintains a current model of what the codebase actually contains.

Those are complementary types of project knowledge.

## 2. Why Hindsight is my leading candidate

Hindsight implements three operations:

Retain — accumulate experience

Ingest Git history and past coding sessions, extract facts and relationships, and consolidate observations as new evidence arrives.

Recall — retrieve only relevant memory

Combine keyword, semantic, graph and temporal search. Results can be trimmed to a token budget instead of loading the entire history.

Reflect — reason over accumulated experience

Synthesize connections between previous memories, decisions and observations, rather than simply returning matching text.

Hindsight also supports knowledge pages: continuously refreshed answers to questions such as "What are the architectural conventions of this repository?" These pages can be retrieved cheaply without recomputing every detail.

GitHub

For Kites, that could look like:

```
Session 114:
  Agent discovers that a proposed OCR refactor
  violates the text-grouping interface.

  → Hindsight stores evidence and the decision.

Session 267:
  Agent plans another OCR architecture change.

  → Hindsight retrieves the relevant history.
  → Frontier model checks it against current code.
  → Agent avoids repeating the old mistake.
```

This is the right kind of learning for your senior-engineer analogy.

### It supports ZCode directly

The current integration documentation explicitly lists ZCode and provides:

Bash

```
npx @vectorize-io/hindsight-coding-agents install zcode
```

This registers ZCode hooks, an MCP server, and a companion skill. The Hindsight backend must also be configured or running.

Interestingly, the integration documentation says ZCode doesn't expose a durable complete session transcript through its hooks, so Hindsight journals the user prompt and assistant reply itself to preserve continuity.

GitHub

Two important settings to inspect are `gitIngest` and `surveyRefreshCommits`. The former defaults to commit messages rather than full diffs, while the latter controls when a codebase structure survey is refreshed. For deep repository learning, those choices matter.

GitHub

## 3. What do its actual benchmarks show?

Hindsight's authors report a coding-agent benchmark involving 61 real repository tasks, with three repetitions.

|   Agent   |   Corrections per task without memory   |   With Hindsight   |
| --- | --- | --- |
|   Claude Code   |   0.85   |   0.36   |
|   Codex CLI   |   1.34   |   0.47   |
|   OpenCode   |   1.20   |   0.80   |

But final task accuracy was essentially unchanged: the agents solved 60–61 of the 61 tasks in either configuration. The improvement was primarily fewer corrections and lower execution cost.

Vectorize

These are vendor-reported results, not an independently established ranking against every other coding-memory tool.

And the independent research is more cautious. The October 2026 [MemDev-Bench](https://arxiv.org/abs/2610.27524?utm_source=chatgpt.com) study constructed 4,869 historical repository tasks and found that memory sometimes made coding agents fail tasks they could otherwise solve—especially when they reused outdated or irrelevant experience.

arXiv

That's why I would be wary of any tool claiming that more retained information automatically means better engineering decisions.

## 4. Why I would pair Hindsight with Repowise

For your particular problem, there's a missing part in conventional memory systems.

Suppose the agent remembers:

> Kites uses subsystem A for OCR region grouping.

But three months later, a refactor moves that responsibility to subsystem B.

Hindsight may still contain the historical fact. Even if the memory is refreshed, an agent should not treat that historical description as authoritative without checking the current implementation.

That's where [Repowise](https://github.com/repowise-dev/repowise?utm_source=chatgpt.com) becomes useful.

It builds a repository index containing source dependencies, symbol relationships, Git change history, architectural decisions, change risks, and module documentation. Its documentation says the index can be kept current as commits arrive, with the information exposed through MCP.

repowise docs

Hindsight

Why did we design it this way?

What failed before?

What did we learn?

Repowise

What exists in the current code?

What depends on what?

What changed recently?

Frontier engineering manager

Uses both historical experience and verified current implementation to make decisions

I think this combination is more suitable for your Kites goal than Hindsight alone.

One caveat: Repowise's open-source edition uses AGPL-3.0, so check the licensing implications before integrating or modifying it as part of commercial infrastructure.

GitHub

## 5. What about ai-memory's autonomous learning loop?

This one deserves attention because it goes beyond passive recording.

The current `ai-memory` documentation describes a shipped auto-improvement loop that periodically:

1. Reviews completed coding sessions.
2. Identifies new lessons, contradictions, or stale knowledge.
3. Proposes edits to its persistent wiki.
4. Validates them and records evidence.
5. Applies approved changes, with configurable human review and optional evaluation gates.

Its knowledge is stored as ordinary, Git-versioned Markdown files, and it supports ZCode hooks as well.

GitHub+1

That makes ai-memory attractive if you care about auditing what the memory system learned and reversing a bad lesson.

Its own comparison documentation acknowledges that it currently lacks native Git-history ingestion, unlike Hindsight.

GitHub

For your use case, I'd evaluate Hindsight and ai-memory as alternatives rather than install both immediately. They overlap substantially in session capture and memory consolidation.

## 6. What I would actually deploy for Kites

01

Hindsight — persistent engineering experience

Let it capture session history, ingest Git changes, consolidate lessons and maintain project-specific knowledge pages.

02

Repowise — current architectural truth

Give the agent direct access to current symbol relationships, code ownership, change history and affected modules.

03

Frontier API manager — system thinking

Use a short product charter, retrieved historical knowledge and current architecture. Allow deeper retrieval on demand, with a rule to verify old memories before making consequential decisions.

04

Independent feedback — actual learning signal

Evaluate whether decisions improved Kites. Feed verified results back into memory, including failed experiments and corrected assumptions.

You can start with a context budget of roughly 10K–30K tokens for the architect's initial project briefing, then allow targeted code and memory retrieval as necessary. That's a starting configuration, not an established optimum.

My conclusion: Among the ready-made systems I examined, Hindsight is the strongest first candidate for your repo-adaptive memory goal, while ai-memory is particularly compelling for transparent, self-correcting learning. Repowise fills the separate but essential codebase-understanding role.

None has demonstrated fully autonomous senior-engineer judgment, and I wouldn't claim a universally proven winner. But Hindsight + current-code intelligence + frontier reasoning is a concrete, available approach that addresses the limitation you've been focused on without requiring repo-specific fine-tuning.

* * *

**You:**

what about use large model + adaptive memory system like this but like use the small finetune model towrad the repo as like helper in term of system thinker task? or just pure memory? the point is still replace the somwhat the outer human layer, of course impossible to fully replace but like can like 80% i mena like a ceo can just talk short about what product and how it show be shortly toward the team of SWE if we use the same prompt to agent it create some ass and people on social media will blame us as bad prpmpt but then why human can continuously sytehm thinker and solve teh product in actaully good way, that the point

* * *

**ChatGPT:**

I think the strongest architecture for your goal is a frontier AI architect + adaptive repository memory + an optional repo-specialized small model. But the real breakthrough would be adding a continuously operating product-thinking and evaluation loop.

Not simply another coding agent or another memory plugin.

You're trying to replace this:

Current development process

You notice a problem → You think about the product → You decide what's worth investigating → You prompt the AI → AI researches and codes → You test and notice another problem → Repeat.

With this:

Desired development process

You define Kites's vision → AI continuously observes the product → Identifies problems and opportunities → Reasons about architecture → Delegates research and implementation → Tests real user outcomes → Learns → Repeats.

The distinction is crucial: memory solves continuity; proactive product reasoning solves initiative; real-world evaluation supplies the learning signal.

The latest Google Research work on proactive coding agents makes essentially this distinction. It calls for evaluating an agent's insight policy: whether it notices what matters, gathers evidence, decides when to act, and improves after feedback. That's beyond merely completing assigned coding tasks.

research.google+1

## 1. Should you add a repo-fine-tuned small model?

Here's how I'd compare the approaches.

|   Architecture   |   What it provides   |   Assessment for Kites   |
| --- | --- | --- |
|   Frontier architect alone   |   Strong reasoning, little persistent experience   |   Insufficient   |
|   Frontier + adaptive memory   |   Strong reasoning with accumulated repository knowledge   |   Best foundation   |
|   Frontier + memory + small repo-trained specialist   |   Adds potentially valuable project-specific review and learned instincts   |   Promising, but unproven incremental benefit   |
|   Small repo-trained model as main architect + frontier workers   |   Cheap recurring coordination, but weaker novel reasoning   |   Higher-risk choice   |
|   Frontier + memory + small specialist + autonomous product evaluation   |   Continuity, initiative and measurable feedback   |   Most complete architecture to investigate   |

The third option is interesting for a reason that hasn't been discussed enough.

A repo-trained small model doesn't necessarily have to replace the frontier model at system thinking. It could serve as a resident engineer who challenges the frontier architect based on what the project has learned.

For example:

Frontier architect: "We should replace the OCR and typesetting pipeline with a unified model."

Kites-specific model: "Before proceeding, investigate these three existing module contracts, the browser memory constraints, and the last two attempts that failed to combine those stages."

Frontier architect: Uses that evidence to reconsider the design, commission experiments, and make the final decision.

That's a plausible way specialization could add value.

However, the same warning could be generated from adaptive memory and a second frontier-model review. There is no convincing head-to-head result establishing that fine-tuned small-model knowledge adds value beyond good retrieval.

The [SWE-Spot](https://arxiv.org/abs/2601.21649?utm_source=chatgpt.com) study supports repository-specific learning in small models, while [Learning to Commit](https://arxiv.org/abs/2603.26664?utm_source=chatgpt.com) supports learning repository-specific practices without updating weights. Neither settles which approach produces a better independent architectural critic.

Junfeng Yang+1

## 2. Why a human engineer improves over time—and why memory alone isn't enough

I agree with the core of your analogy, but a senior engineer accumulates more than knowledge of source code.

Imagine a human engineer who's spent two years building Kites.

They've developed four kinds of understanding:

|   What the human learns   |   What the AI system needs   |
| --- | --- |
|   Codebase understanding — how everything fits together   |   Adaptive repo memory and architecture graph   |
|   Historical judgment — why certain designs succeeded or failed   |   Experience memory, decision records and learned rules   |
|   Product intuition — what makes Kites genuinely useful or frustrating   |   Product requirements, real usage evidence, UX evaluations   |
|   Initiative — deciding which problem matters next   |   Autonomous observation, prioritization and experimentation   |

The first two are increasingly achievable with adaptive memory. The third and fourth are the ones blocking your CEO-style workflow.

Why? Because a human engineer doesn't become senior just from remembering code. They spend years seeing the consequences of their decisions, hearing user complaints, observing failures, understanding business priorities, and correcting their mental model.

That is the experience you need your AI organization to accumulate.

A model trained only on successful coding sessions will miss much of it.

## 3. The complete system I'd propose

Human — Founder

Initial vision, priorities, product constraints, occasional consequential decisions

Continuous product observation

Browser E2E tests · UX agents · User feedback · Performance · Research · Exploration

Frontier AI — Chief Architect / Product Thinker

Identifies problems, decides priorities, creates plans and launches investigations

Adaptive project memory

Architecture, history, user intent, experiments, learned decisions, current evidence

Optional local repo expert

Specialized critic, project historian and architectural consistency checker

Research

Frontier agent

Coding

Frontier agent

QA

Frontier agent

Independent product evaluation

Did this improve the actual user experience? What new problems appeared?

Verified outcomes update memory and trigger the next decision

The persistent scheduler sits outside the diagram's LLM sessions and runs this cycle repeatedly.

### The crucial difference: the architect must be allowed to discover problems

Let's imagine you give Kites only this initial vision:

> Build a browser extension that seamlessly translates manga and comics while preserving artwork and providing a native reading experience. Keep it local-first where practical.

Then stop giving feature-by-feature prompts.

A sufficiently instrumented system might operate as follows:

1. QA agent discovers an issue

An automated browser test finds translated text spilling outside narrow speech bubbles. You didn't report it.

2. Frontier architect investigates the significance

It retrieves Kites's current architecture and previous typesetting decisions. It discovers that multiple related cases fail, suggesting a systematic limitation rather than a single formatting bug.

3. Repo-specialist challenges the proposal

If deployed, the small trained model reviews the architect's proposal against project-specific constraints. It might flag that the proposed change conflicts with existing bubble-grouping behavior.

4. Architect commissions experiments

One worker investigates improved font fitting. Another explores alternative bubble grouping. The system measures readability, visual collisions and performance.

5. Implementation and independent verification

The architect selects the evidence-supported design, assigns coding work and asks independent QA to check both the new behavior and existing workflows.

6. The engineering organization learns

It records what was wrong with the previous architecture, which experiment worked, and what new product behavior should be protected. Those become future memory and regression tests.

None of this requires the human to prompt "fix bubble overflow." The product's evaluation system supplied the initial signal.

But here's the limitation: if no test, user observation, research agent or other signal identifies the problem, the architect may never investigate it.

That's why automating product observation is just as important as improving AI memory.

Princeton's October 2026 SWEeper-Bench illustrates the difficulty. The best tested frontier agents found and repaired only 59% of hidden interaction bugs, despite being able to handle roughly 96% when the bugs were described. The hard part was often discovering the problem itself.

arXiv

## 4. What role should the fine-tuned small model actually have?

I see three sensible roles, but I'd evaluate them differently.

|   Small model role   |   Value   |   Would I train it now?   |
| --- | --- | --- |
|   Repo historian — explains historical decisions and constraints   |   Mostly reproducible with good memory retrieval   |   No   |
|   Architectural critic — reviews frontier proposals for project-specific mistakes   |   Potentially valuable beyond retrieval   |   Worth a future experiment   |
|   Autonomous product manager — decides priorities and launches work itself   |   Most ambitious; hardest to validate   |   No, not without evidence   |

The most interesting is the architectural critic, because it gives the trained model a narrow but potentially valuable purpose.

Instead of forcing a 4B model to invent the future architecture, let it specialize in detecting decisions that conflict with the project's accumulated experience.

It could evaluate questions such as whether a proposal duplicates existing functionality, violates a design boundary, forgets a historical failure, or creates a dependency that previously caused problems.

But the critic must cite the relevant evidence. It shouldn't veto changes merely because they differ from its training history; sometimes old architecture needs to be replaced.

A useful initial test is to perform the same review using an untrained model with adaptive memory. If the fine-tuned critic doesn't detect significantly more real mistakes, there's little reason to retain the training pipeline.

## 5. Could this replace 80% of your outer human involvement?

Possibly 80% of routine engineering coordination within a well-defined product area. There is currently no evidence that it can reliably replace 80% of a founder's overall product judgment.

There's a meaningful difference.

|   Human activity you currently perform   |   Automation potential   |
| --- | --- |
|   Prompt agents to investigate failing tests   |   High   |
|   Remind agents of existing architecture   |   High   |
|   Select routine bugs and performance regressions   |   High   |
|   Tell agents to research implementation alternatives   |   High   |
|   Notice common UI failures through structured testing   |   Moderate–high   |
|   Detect subtle, previously unknown UX frustrations   |   Uncertain   |
|   Decide when Kites needs a fundamental redesign   |   Uncertain   |
|   Know what users will value before reliable feedback exists   |   Difficult   |
|   Invent a new product direction from weak signals   |   Difficult   |

These are qualitative assessments, not measured automation percentages.

A CEO can give human engineers a short vision because the team also acquires thousands of additional signals: conversations with customers, product usage, operational incidents, meetings, commercial pressures, and feedback from colleagues.

That short instruction is not the team's entire input.

Your AI organization needs equivalents of those information channels. More tokens, stronger retrieval or fine-tuned weights alone won't create them.

This aligns with a recent systematic review of AI-based requirements engineering: automated extraction and analysis have progressed, but sustained lifecycle management, stakeholder validation, and long-term learning remain weak areas.

MDPI

## 6. What I would build first for Kites

I'd implement the following in this order.

## 1

Product charter + adaptive memory

Define what a successful manga translation experience means, plus measurable constraints. Use Hindsight or another memory layer to accumulate engineering history, product decisions and lessons.

## 2

Autonomous observation system

Make automated evaluators continuously find translation failures, performance regressions, untested workflows and UX problems. Add real-user feedback where available.

## 3

Frontier architect running automatically

Trigger the architect when new evidence appears and at scheduled review intervals. Give it a budget to investigate, prioritize, commission experiments and delegate coding tasks.

## 4

Independent evaluation and experience learning

Verify outcomes, update memory, revise stale rules, and record which autonomous decisions were useful. Evaluate new work against the product vision, not only passing tests.

## 5

Add a trained repo-specialist only after measuring the gap

Collect instances where the frontier architect made poor Kites-specific decisions despite receiving relevant memory. Train a small critic on those examples, then measure whether it catches mistakes that the memory-only system misses.

I would start by measuring one quantity: what percentage of valuable Kites engineering tasks does the AI independently initiate, execute and verify without you having to identify the task?

That directly measures whether the system is replacing your outer prompting role.

You could begin with a small set of historical Kites failures that you personally discovered. Reset the repository to a state before each fix and see whether the autonomous system identifies the problem without being told what it is. Then measure task quality, regressions, cost and required human corrections.

### The key research insight

The more I examine your goal, the less I think the missing ingredient is a model that memorizes Kites extremely well.

It's a system that does four things continuously:

Observe the product → Form useful engineering hypotheses → Test them in the real application → Learn which decisions improved the product.

Adaptive memory allows the organization to retain the experience. A frontier model supplies reasoning. A fine-tuned small model might eventually add project-specific intuition or serve as a specialized reviewer.

But the observation, experimentation, and feedback loop is what turns a collection of coding agents into something closer to a self-directed engineering team.

That's where I'd concentrate the main investment.

* * *

**You:**

ủa chẳng phải cái tôi nói https://github.com/paperclipai/paperclip giải quyết dc hết à hay ntn ? chx hiểu lắm

* * *

**You:**

paperclip khác j cái superagent mới của deepseek

* * *

**ChatGPT:**

Paperclip và DeepSeek SuperAgent khá giống nhau ở mục tiêu giảm việc con người phải liên tục prompt và quản lý agent. Nhưng chúng giải quyết bài toán ở hai cấp khác nhau.

* [Paperclip](https://github.com/paperclipai/paperclip?utm_source=chatgpt.com) = AI Company OS. Tổ chức một công ty AI gồm CEO, CTO, engineers, QA, giao việc, quản lý nhiều project, budget và tiến độ.
* [DeepSeek SuperAgent](https://github.com/deepseek-ai/dsh-superagent-prototype?utm_source=chatgpt.com) = Persistent autonomous agent. Một agent làm việc lâu dài với repository, nghe sự kiện từ GitHub/chat, tự quyết định khi nào cần hành động, tạo worker riêng và theo dõi công việc qua nhiều session.

Điểm đáng chú ý: DeepSeek tập trung nhiều hơn vào continuity, event-driven behavior và context management; Paperclip tập trung vào quản lý cả tổ chức AI.

GitHub+2

## 1. So sánh trực tiếp

|   Khả năng   |   Paperclip   |   DeepSeek SuperAgent   |
| --- | --- | --- |
|   CEO → CTO → SWE hierarchy   |   Native   |   Không phải mô hình chính   |
|   Multi-agent song song   |  |  |
|   Tự spawn worker/session   |  |  |
|   Tự chạy lại không cần prompt   |   Heartbeat, routines   |   Event triggers, persistent sessions   |
|   Tự đọc GitHub, phản ứng với issue/PR   |   Qua integrations và agent workflows   |   Native GitHub event workflow   |
|   Memory xuyên session   |   Task history, session state   |   Router, sessions, Chain of Recall trong thiết kế   |
|   Context tiết kiệm theo nhu cầu   |   Agent runtime / memory integration   |   Inline & Spill, Chain of Recall   |
|   Tự theo dõi agent bị kẹt   |   Recovery, review gates   |   Independent watchdog trong thiết kế   |
|   Quản lý nhiều repositories/apps   |  |   Prototype nhắm một repository   |
|   Budget, approval, dashboard   |   Rất đầy đủ   |   Panel và authorization, ít tập trung vào company management   |
|   Tự học kiến trúc codebase theo thời gian   |   Chưa có hệ thống đầy đủ mặc định   |   Chưa có hệ thống đầy đủ mặc định   |

Lưu ý rằng DeepSeek gọi repo của họ là research prototype, và xác nhận một số phần trong bài viết thiết kế chưa được triển khai trong bản open-source. Paperclip cũng đánh dấu Memory/Knowledge là đang phát triển và Automatic Organizational Learning vẫn nằm trên roadmap.

GitHub+1

## 2. Ví dụ cùng một yêu cầu với Kites

Paperclip: tổ chức team phát triển Kites

```
Bạn: "Make Kites the best manga translator"
   ↓
CEO Agent
   ├── CTO
   │    ├── OCR Engineer
   │    ├── Rendering Engineer
   │    └── QA Engineer
   └── Product Manager
        ├── Research competitors
        └── Identify product gaps
   ↓
Task assignment + heartbeats
   ↓
Agents làm việc, báo cáo, tiếp tục
```

Trọng tâm: ai chịu trách nhiệm cái gì, thứ tự ưu tiên, phân công việc và quản lý toàn bộ tổ chức.

DeepSeek SuperAgent: một kỹ sư AI thường trực

```
GitHub issue / PR / Chat / CI event
   ↓
Filter: Có đáng hành động không?
   ↓
Persistent Router
   ├── Worker A: Investigate OCR issue
   ├── Worker B: Fix rendering bug
   └── Worker C: Review existing PR
   ↓
Workers trả kết quả về Router
   ↓
Agent cập nhật đúng thread ban đầu
```

Trọng tâm: một agent có thể liên tục nhận sự kiện, thực hiện nhiều task đồng thời, không bắt con người quản lý từng session.

DeepSeek còn có một thiết kế khá hay là Chain of Recall: khi agent cần tìm lại thông tin, nó có thể lần theo các mối liên hệ giữa event, thread và worker session, thay vì đọc toàn bộ history. Đây là cơ chế quản lý context theo nhu cầu, không phải tự học sâu kiến trúc repository.

Full English Translation+1

## 3. DeepSeek có điểm gì mà Paperclip chưa giải quyết tương đương?

DeepSeek mô tả ba ý tưởng đặc biệt đáng học:

* Router/Worker separation: Router chỉ giữ ngữ cảnh tổng thể và giao việc; các worker đảm nhận suy luận và thực thi chi tiết, có thể tiếp tục nhận sự kiện của đúng task.
* Fast Path / Slow Path: Những event đơn giản được lọc và định tuyến bằng code. Chỉ những trường hợp cần suy luận mới gọi LLM, tránh lãng phí token.
* Independent Watchdog: Theo dõi xem agent có thực sự tiến triển hay mắc kẹt trong vòng lặp, không chỉ kiểm tra process còn chạy.

Tuy nhiên, đây là thiết kế được trình bày trong bài nghiên cứu; không nên mặc định cả ba đã hoàn chỉnh trong prototype.

Full English Translation+1

Ngược lại, Paperclip có sẵn những thứ DeepSeek prototype không tập trung triển khai: org chart CEO/CTO/engineers, quản lý nhiều công ty, ngân sách theo agent, phân cấp task theo business goal, approvals, dashboard và hỗ trợ nhiều coding harness khác nhau.

GitHub+1

## 4. Vậy với mục tiêu tự phát triển Kites, cái nào hợp hơn?

|   Mục tiêu   |   Phù hợp hơn   |
| --- | --- |
|   Tự vận hành một team AI có CEO, CTO, QA, researcher   |   Paperclip   |
|   Một agent thường trực xử lý GitHub issues, PR, chat và CI   |   DeepSeek SuperAgent   |
|   Nhiều agent phát triển nhiều app cùng lúc   |   Paperclip   |
|   Quản lý ngữ cảnh giữa các thread và event   |   DeepSeek có thiết kế chuyên biệt hơn   |
|   Tự khám phá feature nào đang thiếu   |   Cần thiết lập discovery/evaluation workflow riêng   |
|   Tự học kiến trúc repo và tích lũy system thinking   |   Cả hai đều cần bổ sung adaptive memory   |
|   Tự động kiểm tra chất lượng UX như một người dùng   |   Cần thêm product-level testing và feedback   |

### Cách mình sẽ kết hợp cho hệ thống bạn đang nghĩ tới

Paperclip — AI Company / PM / CTO

Persistent repo memory + product knowledge

Proactive event routing + workers

Học thiết kế từ DeepSeek SuperAgent

Frontier coding agents + real-app QA

Product feedback → new tasks → verified changes → updated memory

Đây là kiến trúc kết hợp đề xuất, không phải một integration Paperclip + DeepSeek đã được xác nhận là cài vào chạy ngay. Bạn cũng không nhất thiết cần chạy cả hai: có thể dùng Paperclip làm orchestrator và áp dụng các ý tưởng routing của DeepSeek vào agent workflow.

Kết luận: Nếu mục tiêu là xây dựng một AI software company để tự phát triển Kites và những app khác, Paperclip cung cấp khung tổ chức gần hơn với điều bạn tìm.

Nếu mục tiêu là một AI engineer thường trực, chủ động theo dõi và xử lý công việc xuyên suốt GitHub, DeepSeek SuperAgent tập trung đúng vào bài toán đó.

Nhưng cả hai chưa tự giải quyết vấn đề sâu nhất bạn hỏi từ đầu: làm sao một AI CTO trở nên ngày càng hiểu sản phẩm, biết tự đặt ra câu hỏi đúng, và đưa ra quyết định system design tốt hơn qua nhiều tháng. Phần đó vẫn cần adaptive project knowledge, product observation và một vòng đánh giá kết quả đáng tin cậy.