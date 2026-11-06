## Context
Xây một hệ thống thực sự vận hành được theo hướng đã thống nhất: **Paperclip là UI/control plane; DeepSeek Harness (DSH) là runtime thực thi; localization trước, tối ưu token sau; workflow và tài nguyên thích ứng có kiểm chứng**. Sau bước duyệt này, tôi sẽ tự triển khai, kiểm thử, sửa lỗi và tiếp tục các milestone, không hỏi lại các quyết định kỹ thuật thông thường.

### Những gì đã xác minh
- Repo hiện có CLI/UI quản lý tài nguyên và 11 test suites; chưa có orchestration, judges, Paperclip hay Hindsight integration.
- DSH cài trên máy là `0.2.2-rc.1`, có SDK JSON-RPC, streaming và preset/subagent services. MCP dùng Cordis configuration, **không tự đọc `.mcp.json`**.
- Paperclip đã có task dependencies, worktree execution, review/approval policies, external adapters và plugins. Không xây lại các hệ thống này.
- Hindsight có plugin `@vectorize-io/hindsight-paperclip` sẵn dùng.
- `xisnn/harness2-dsh` chỉ chuyển đổi output Harness² thành preset; không phải bộ tối ưu chạy sẵn. Harness² upstream có 8 nhóm tài nguyên có thể chỉnh, gồm cả scripts/plugins; việc chạy mã sinh ra cần isolation riêng.

## 1. Bảo toàn hiện trạng và sửa tài liệu
- Ghi nhận working tree hiện tại, giữ nguyên thay đổi có sẵn; tạo implementation branch/worktree, không reset hay overwrite công việc của bạn.
- Tạo feature Spec Kit mới `specs/002-paperclip-dsh-adaptive/`: `spec.md`, `research.md`, `plan.md`, `tasks.md`, `data-model.md`, `contracts/`, `quickstart.md`.
- Giữ lịch sử và phần resource-manager của `001`; đánh dấu các đề xuất cũ đã superseded thay vì xóa spec và milestone đã hoàn thành.
- Điều chỉnh constitution cùng ADR để phản ánh DSH-only execution và giới hạn thực tế; AGENTS.md vẫn là thin router, phân biệt sản phẩm đang xây với quy trình phát triển repo.
- Không dùng các cam kết không có bằng chứng như “0 regression”, “tiết kiệm 80%”, hay “tước Skill đảm bảo zero preview mọi harness”.

## 2. Dùng Paperclip làm nền tảng, hạn chế fork drift
- Cài một phiên bản Paperclip được pin, trong instance local riêng, bind loopback và tắt telemetry; giữ upstream database, budgets, approvals và audit log.
- Tạo adapter/plugin riêng và team/project template. Chỉ dùng local upstream checkout/patch khi extension API thật sự thiếu; ghi rõ phiên bản, license và patch cần thiết. Không tạo public GitHub fork hoặc publish package trong bước này.
- Tái sử dụng native workspace strategy, task checkout, dependency graph, heartbeat, review stages và UI.
- Không thêm Warden hay DSH SuperAgent thành scheduler thứ hai. Chỉ tái sử dụng pattern/code phù hợp và có license rõ ràng.

**Topology mục tiêu**:
```text
User goal / manual request / configured trigger
                 |
       Paperclip CEO/PM (L0)
       discovery -> approved objective -> dependency graph
                 |
       Paperclip isolated execution workspace
                 |
       DSH generalist task lead (L1)
       evidence <-> plan -> implement -> checks -> review
                 |
       Scoped specialist helpers / independent judges (L2)
                 |
       Review-ready output -> integration verification
```

## 3. Resource localization và an toàn trước automation
Tái sử dụng các module hiện có:
- `.agent/src/workspace.ts`: `findWorkspaceRoot`, `getWorkspacePaths`.
- `.agent/src/skills.ts`: `addSkill`, `removeSkill`, dormant/local lifecycle.
- `.agent/src/catalog.ts`, `resources.ts`: catalog và effective inventory.
- `.agent/src/mcp.ts`: workspace declarations, bổ sung renderer DSH thay vì coi `.mcp.json` là portable runtime config.

Thay đổi trọng yếu:
- Đọc status/catalog không được âm thầm import, activate hoặc viết global config.
- Workspace enable/disable chỉ thay đổi workspace; không export project-private resources lên global.
- Catalog giữ nguội ngoài discovery roots. Selected resources được stage vào run snapshot; shared catalog không bị worker sửa trực tiếp qua symlink.
- Sửa bất đồng `doctor.ts` / `workspace.ts` / `auto-heal-symlinks.sh`; thao tác backup, collision handling, atomic writes và idempotency.
- Loại bỏ implicit trust-store mutation của `autoTrustWorkspaceMcps()` khỏi heal/enable paths; không viết tay approval records để né native trust flow.
- DSH managed profile có allowlist skills/MCP/subagents/hooks riêng, không thay cấu hình desktop hiện tại. Phát hiện global leakage phải báo lỗi rõ, không chỉ báo “clean”.

## 4. Adapter Paperclip → DSH
Tạo package `packages/paperclip-adapter-dsh/`, dùng contract upstream `createServerAdapter`, `AdapterExecutionContext`, `AdapterExecutionResult`, session codec và UI parser.
- Dùng DSH SDK chính thức nếu tương thích; nếu cần thin JSON-RPC transport thì kiểm tra với protocol/runtime cài thực tế, không giả API.
- Support initialize, prompt, streaming events, resume, cancellation, timeout, shutdown và usage reporting.
- Map runtime questions/approvals sang Paperclip; không auto-approve tất cả tool calls.
- Reuse cwd/worktree do Paperclip cấp, không tạo worktree lồng nhau.
- Resume chỉ khi project/workspace/workflow-version khớp; có recovery rõ ràng khi session mất.
- Kiểm tra kết quả thực chất: process exit 0 không đồng nghĩa task đã đạt yêu cầu.
- Log redaction, bounded output, không in credentials hay private reasoning vào UI.

## 5. Workflow kernel + skills, không phải một prompt khổng lồ
Tạo package `packages/adaptive-workflow/` gồm typed contracts, stage/evidence ledger, versioned policy và orchestration integration. Prompts/skills nằm riêng trong `resources/` và load theo nhu cầu.

### L0: chủ động nhưng không tự mở rộng quyền
- **Fast path** cho yêu cầu rõ, hẹp; **discovery path** cho goal lớn/thiếu tiêu chí. Không dùng “ambiguity >= 0.5” giả chính xác.
- Discovery tự khảo sát code, donor, nhu cầu, edge cases, risks, alternatives và đưa ra milestone/dependency graph.
- Phân biệt điều user yêu cầu, giả định hợp lý, đề xuất bổ sung và phạm vi cần approval. Port/parity discovery chỉ dùng nguồn được phép.
- Có stop criteria và ngân sách; không tìm vô hạn hay tự tạo tính năng không liên quan.

### L1/L2
- L1 là generalist lead chung; L2 là helper chuyên môn hoặc judge độc lập.
- Runtime kiểm soát logical lineage, max depth 2, tổng concurrency/turn/time budgets; không chỉ dựa vào frontmatter Claude/ZCode.
- Paperclip L0 và DSH L1 có thể là session roots khác nhau: chuyển tiếp logical depth bằng run envelope và kiểm tra tại mọi delegation path.
- L2 không được tiếp tục spawn qua subagent/workflow/team hay đường vòng được expose. Skill/tool allowlist theo vai trò, không cấm Skill máy móc nếu helper thật sự cần skill đã chọn.
- Worktree là isolation khỏi collision, **không phải security sandbox**. Workers không được cấp shell host không giới hạn rồi tuyên bố read-only; judge chạy read-only snapshot và verifier commands được host kiểm soát. Nơi chưa có OS isolation phải thể hiện đúng mức bảo vệ và fail closed với untrusted executable resources.

## 6. Evidence-first gates và independent review
Dùng một lifecycle chung linh hoạt, không ép mọi task phải có test thất bại:
1. Xác định objective và acceptance evidence.
2. Khảo sát/baseline/reproduce khi phù hợp.
3. Grounded plan, thực thi và cập nhật plan khi có chứng cứ mới.
4. Deterministic checks, independent review và đóng gói kết quả.

- Bug: reproduction evidence trước khi chốt repair plan. Test failure phải đúng triệu chứng, không phải lỗi môi trường.
- Feature: thiết kế contract trước, acceptance tests trước implementation khi khả thi.
- Refactor: characterization/behavior-preservation tests; không tạo RED giả.
- Docs/research/non-SWE: validators và rubric phù hợp, không ép compiler/TDD.
- Blocking bug: subtask/deviation có bằng chứng, đánh giá impact và quay lại mục tiêu chính; refactor lớn được phê duyệt theo scope, không phạt chỉ vì diff lớn.
- Implementer được biết rubric từ đầu. Máy kiểm tra điều máy đo được; judge độc lập kiểm tra reasoning/coverage/risk với đủ evidence, không giới hạn giả “1 turn/1000 tokens”.
- Gate result gồm verdict, findings, evidence refs, input commit/config hashes. Source/plan đổi thì evidence liên quan bị invalidated.
- Dùng CodePath rubric có chọn lọc, kiểm tra license; bỏ contribution-tone requirements không phù hợp nhưng giữ cause grounding, decisive tests, honest PR reporting.
- Giới hạn repair loop có cấu hình; khi hết budget, giữ artifact và blocker thay vì loop vô hạn.
- Tận dụng Paperclip execution policies để kiểm soát completion. Kiểm thử trường hợp worker cố tự đánh dấu done hoặc bỏ qua review.

## 7. Hindsight: dùng integration có sẵn
- Cài và pin plugin Paperclip chính thức, kết nối Hindsight self-hosted hoặc endpoint đã có; không viết memory database thứ hai.
- Kiểm tra prerequisite model/backend thay vì nói “cài là xong”. Dùng auth đã cấu hình qua official runtime interfaces, không trích token/cookie từ credential stores.
- Chọn bank isolation theo project/company/agent để không lẫn dữ liệu dự án.
- Lưu provenance, phân biệt observation chưa xác minh và verified lesson; xác minh retain/recall bằng round-trip thực.
- Plugin upstream tự retain comments có thể giữ cả thông tin chưa đúng: cấu hình/filter trước khi dùng làm procedural guidance.
- Khi backend chưa sẵn sàng, outbox giữ observation để retry có idempotency; UI báo degraded, không giả memory đã hoạt động.

## 8. Adaptation thực sự: version → evaluate → promote → rollback
- Mỗi run pin một workflow/resource version; active run không bị hot-edit ngầm.
- Agent có thể chọn helper đã phê duyệt trong run. Tạo/sửa/cài skill, subagent, workflow hoặc plugin thành **candidate version riêng**, không sửa shared production files.
- Meta-session sau task hoặc explicit improvement job dùng trace để đề xuất candidate. Có thể probe task đang khó trong run mới, nhưng không đổi rules của run cũ.
- Integrate Harness² qua execution adapter có sandbox và budget; dùng converter `harness2-dsh` đúng chức năng. Không chạy upstream unrestricted executors trên home/workspace thật.
- Evaluation: baseline vs candidate, held-out tasks, correctness/regression, resource leakage, cost/latency và rollback. Không lấy merged PR text làm đáp án duy nhất.
- Worker không được sửa acceptance evaluator/authorization để tự pass. Permission expansion, executable third-party code và thay governance đi qua approval; low-risk prompt/resource changes có thể auto-promote sau khi vượt các check đã cấu hình.
- Pin source commit/license/checksum của donor; update vào staging và review/test trước activation.

## 9. Setup, UI và autonomous test/fix loop
- Reuse Paperclip UI; chỉ thêm project resource inventory, workflow/gate evidence và adaptation version/status khi upstream chưa có view phù hợp.
- Bootstrap idempotent: preflight, pinned dependencies, isolated instance/profile, import team, start/stop/status/doctor, backups và rollback instructions.
- Không thay DB engine hay xóa budget/approval chỉ để “nhẹ”; giữ update path upstream.
- Tiếp tục tự làm toàn bộ milestone sau duyệt; dùng subagents cho phần độc lập, integration lead xử lý interfaces và tổng kiểm thử.

### Verification
1. Chạy baseline tests trong HOME/XDG tạm, trước hết kiểm tra test không chạm global config thật.
2. Unit/contract tests: path traversal, dangling symlink, collision, malformed JSON/YAML, atomicity, no hidden host writes, project A/B isolation, resource version pinning.
3. Adapter tests: malformed/partial JSON-RPC, stdout/stderr separation, cancellation, crashes, quota/timeout, resume mismatch, output redaction.
4. Workflow tests: invalid transitions, spoofed PASS, stale evidence, dependency/review bypass, nested spawn bypass, budgets and blocking bugs.
5. Integration: real local Paperclip + adapter + fixture DSH driver; restart/recovery, review rejection/repair/acceptance, persisted artifacts.
6. Browser E2E: create goal, observe task dependencies, stream logs, resource selection, review evidence, pause/resume và version rollback.
7. Bounded live DSH smoke tests trên repo fixture: một bug, một feature/refactor, một discovery task; sử dụng model/account sẵn có, không tự đổi provider hay đăng ký dịch vụ trả phí. Không có credentials thì báo blocker cụ thể; mock pass không thay thế live pass.
8. Hindsight retain/recall và Harness² baseline/candidate/promotion/rollback được test riêng; báo rõ live-tested vs fixture-tested.
9. Lặp test → fix → regression đến khi đạt acceptance hoặc có blocker thực sự. Bàn giao URL local, commands, test report, limitations và trạng thái dịch vụ.

## Boundaries
Không public fork/push/PR, deploy internet, xóa cấu hình cá nhân, force-push hay sửa account credentials. Các integration chạy local; task “create PR” mặc định tạo review-ready package, external publication chỉ bật bằng policy rõ ràng. Không cam kết “oneshot không lỗi”: cam kết tự chạy vòng kiểm thử/sửa lỗi và báo kết quả trung thực.

### Nguồn đã kiểm tra
- Paperclip external adapter: https://github.com/paperclipai/paperclip/blob/master/docs/adapters/external-adapters.md
- Paperclip capabilities/workspaces/reviews: https://github.com/paperclipai/paperclip/blob/master/README.md
- Hindsight plugin: https://hindsight.vectorize.io/sdks/integrations/paperclip
- Harness² editable components: https://github.com/google-research/harness2
- Converter giới hạn: https://github.com/xisnn/harness2-dsh