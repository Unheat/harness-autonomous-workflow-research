# Feature Specification: 3-Tier MiniSearch Hybrid Engine

**Feature Branch**: `002-minisearch-engine`
**Created**: 2026-11-04
**Status**: Ready
**Input**: "3-Tier Hybrid Search Engine for Skills & MCPs (Prefix boost x10, Description keyword boost x3, Typo tolerance) using bundled offline MiniSearch"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prefix-Boosted Slug Search (Priority: P1) 🎯

As a developer searching for a group of related skills (e.g. `speckit`), I want typing a prefix like `spec` to instantly rank all `speckit-*` skills at the top with a 10x boost, so exact/prefix matches are never buried by fuzzy noise.

**Why this priority**: Exact and prefix matches are the most frequent search actions when a developer knows part of the tool name.

**Independent Test**: Type `spec` in the skills search bar -> all `speckit-*` skills appear at the top.

**Acceptance Scenarios**:
1. **Given** 40+ skills in catalog, **When** searching `spec`, **Then** skills starting with `speckit-` receive top BM25 rank score (Boost x10).
2. **Given** typing `impec`, **When** searching, **Then** `impeccable` appears as the top result.

---

### User Story 2 - Keyword Search Across Tool Descriptions (Priority: P1) 🎯

As a developer looking for a capability by its function (e.g. "design", "word", "disassembly", "pdf"), I want the search engine to search through `description` fields with a 3x boost, so I don't need to memorize exact tool slugs.

**Why this priority**: Solves the discovery problem where a user knows what they want to do but not the arbitrary slug name.

**Independent Test**: Type `design` -> `impeccable` appears even though the word "design" is not in the slug `impeccable`.

**Acceptance Scenarios**:
1. **Given** `impeccable` with description "Design and visual craft QA", **When** searching `design` or `ui`, **Then** `impeccable` is returned.
2. **Given** `rea` with description "Reverse engineering & binary disassembly toolkit", **When** searching `reverse` or `disassembly`, **Then** `rea` is returned.
3. **Given** `docx` with description "Word document creation and analysis", **When** searching `word`, **Then** `docx` is returned.

---

### User Story 3 - Typo-Tolerant Fuzzy Matching (Priority: P2)

As a developer mistyping a character on the keyboard (e.g. `spekit` or `red`), I want Levenshtein distance typo tolerance to recover the intended tool.

**Why this priority**: Improves developer flow by tolerating common 1-2 character typos without returning 0 results.

**Independent Test**: Type `spekit-clan` -> `speckit-plan` is returned.

**Acceptance Scenarios**:
1. **Given** typing `spekit`, **When** query is processed, **Then** `speckit-*` tools are returned with fuzzy matching.
2. **Given** typing `clena`, **When** query is processed, **Then** `harness-protocol` (clean environment) or relevant tools are returned.

---

### User Story 4 - 100% Offline Zero-CDN Operation (Priority: P1) 🎯

As a developer operating offline or in air-gapped environments, I want MiniSearch bundled locally into the web dashboard assets, with zero external network requests.

**Why this priority**: Reliability, privacy, and speed in local developer tools.

**Independent Test**: Load `http://localhost:20888` with Wi-Fi disabled -> search functions instantly without console network errors.

**Acceptance Scenarios**:
1. **Given** network disabled, **When** dashboard opens, **Then** `/minisearch.js` loads from local static file and initializes `window.MiniSearch`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST bundle MiniSearch UMD in `.agent/ui/minisearch.js` and serve it at `GET /minisearch.js`.
- **FR-002**: Backend `/api/status` MUST include `description` for each active, dormant, and catalog skill.
- **FR-003**: Frontend MUST construct a MiniSearch index indexing fields `name` (boost: 10) and `description` (boost: 3).
- **FR-004**: Search query options MUST enable `prefix: true` and `fuzzy: 0.2` (Levenshtein distance).
- **FR-005**: When query is empty, frontend MUST display all items sorted by active state first, then alphabetically.

---

## Success Criteria *(measurable)*

- **SC-001**: 100% of skills with descriptions searchable by function keywords.
- **SC-002**: Search execution latency under 5 milliseconds on 100+ tools.
- **SC-003**: 0 external network requests during dashboard operation.
