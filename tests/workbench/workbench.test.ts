import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, symlinkSync, readlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverNode, environment, command, supportedNode } from "../../scripts/workbench/runtime";
import { nativeLinks } from "../../scripts/workbench/native";
import { installPlan, setup, MANIFEST } from "../../scripts/workbench/setup";
import { main } from "../../scripts/workbench/cli";
import { paths, SOURCE, VERSION } from "../../scripts/workbench/constants";
import { initialize, inspect, health, validateConfig } from "../../scripts/workbench/workbench";

const roots: string[] = [];
function temp() { const p = mkdtempSync(join(tmpdir(), "workbench-test-")); roots.push(p); return p; }
function put(p: string, value: unknown) { mkdirSync(join(p, ".."), { recursive: true }); writeFileSync(p, JSON.stringify(value)); }
afterEach(() => { for (const p of roots.splice(0)) rmSync(p, { recursive: true, force: true }); });

function nativeFixture() {
  const root = temp();
  const pkg = join(root, "node_modules/@embedded-postgres/darwin-arm64");
  put(join(pkg, "package.json"), { name: "@embedded-postgres/darwin-arm64", version: "18.1.0-beta.16" });
  put(join(pkg, "native/lib/real.dylib"), {});
  put(join(pkg, "native/pg-symlinks.json"), [{ source: "native/lib/real.dylib", target: "native/lib/alias.dylib" }]);
  return { root, pkg, link: join(pkg, "native/lib/alias.dylib") };
}

describe("runtime boundaries", () => {
  test("minimum Node patch and discovery skips default Node 20", () => {
    expect(supportedNode("v24.10.9")).toBe(false);
    expect(supportedNode("v24.11.0")).toBe(true);
    expect(supportedNode("v26.13.0")).toBe(true);
    expect(supportedNode("v24.11.0-rc.1")).toBe(false);
    expect(discoverNode({}, p => p === "/opt/homebrew/bin/node" ? "v26.13.0" : "v20.0.0")).toBe("/opt/homebrew/bin/node");
    expect(() => discoverNode({ WORKBENCH_NODE: "/bad" }, () => "v20.0.0")).toThrow();
  });
  test("environment isolates configuration and uses argv without a shell", () => {
    const p = paths(temp());
    const env = environment(p, "/opt/homebrew/bin/node", { HOME: "/home/test", DATABASE_URL: "evil", NODE_OPTIONS: "evil", PAPERCLIP_HOME: "/other" });
    expect(env.PAPERCLIP_HOME).toBe(p.state);
    expect(env.PAPERCLIP_TELEMETRY_DISABLED).toBe("1");
    expect(env.HOST).toBe("127.0.0.1");
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.NODE_OPTIONS).toBeUndefined();
    const c = command(p, "/node", ["plugin", "install", "literal;not-shell"]);
    expect(c.argv).toContain("literal;not-shell");
    expect(c.argv).toContain(p.config);
    expect(c.shell).toBe(false);
  });
});

describe("reviewed native link hydration", () => {
  test("dry check is read-only; hydration is relative and idempotent", () => {
    const f = nativeFixture();
    expect(nativeLinks(f.root, false)).toBe(1);
    expect(existsSync(f.link)).toBe(false);
    nativeLinks(f.root, true);
    expect(readlinkSync(f.link)).toBe("real.dylib");
    expect(nativeLinks(f.root, true)).toBe(0);
  });
  test("rejects path escape before creating any links", () => {
    const f = nativeFixture();
    put(join(f.pkg, "native/pg-symlinks.json"), [
      { source: "native/lib/real.dylib", target: "native/lib/alias.dylib" },
      { source: "../../outside", target: "native/lib/other.dylib" },
    ]);
    expect(() => nativeLinks(f.root, true)).toThrow();
    expect(existsSync(f.link)).toBe(false);
  });
  test("rejects symlink ancestors and conflicting files without overwrite", () => {
    const f = nativeFixture();
    writeFileSync(f.link, "keep");
    expect(() => nativeLinks(f.root, true)).toThrow();
    expect(readFileSync(f.link, "utf8")).toBe("keep");
    rmSync(f.link);
    rmSync(join(f.pkg, "native/lib"), { recursive: true });
    symlinkSync(temp(), join(f.pkg, "native/lib"));
    expect(() => nativeLinks(f.root, true)).toThrow();
  });
});

describe("instance safety and read-only diagnostics", () => {
  test("fresh config is isolated, loopback, private and telemetry-off; rerun preserves it", () => {
    const p = paths(temp());
    initialize(p);
    const config = readFileSync(p.config, "utf8");
    expect(JSON.parse(config).telemetry.enabled).toBe(false);
    validateConfig(p);
    initialize(p);
    expect(readFileSync(p.config, "utf8")).toBe(config);
  });
  test("rejects unsafe existing config without replacing it", () => {
    const p = paths(temp()); initialize(p);
    const config = JSON.parse(readFileSync(p.config, "utf8")); config.server.host = "0.0.0.0";
    put(p.config, config);
    expect(() => initialize(p)).toThrow();
    expect(JSON.parse(readFileSync(p.config, "utf8")).server.host).toBe("0.0.0.0");
  });
  test("rejects managed-directory symlinks", () => {
    const root = temp(); symlinkSync(temp(), join(root, ".workbench"));
    expect(() => initialize(paths(root))).toThrow();
  });
  test("doctor does not create missing state", () => {
    const p = paths(temp());
    const result = inspect(p, () => "/node");
    expect(result.ok).toBe(false);
    expect(existsSync(p.state)).toBe(false);
  });
  test("install identity check rejects wrong version", () => {
    const p = paths(temp()); initialize(p);
    put(join(p.install, "node_modules/paperclipai/package.json"), { name: "paperclipai", version: "wrong" });
    const result = inspect(p, () => "/node");
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).toContain(VERSION);
  });
  test("health checks strict JSON, bounds timeout, and disallows redirects", async () => {
    const calls: any[] = [];
    const fake = async (url: any, opts: any) => { calls.push([url, opts]); return new Response(JSON.stringify({ status: "ok" }), { status: 200 }); };
    expect((await health(fake as typeof fetch)).ok).toBe(true);
    expect(calls[0][0]).toBe("http://127.0.0.1:3100/api/health");
    expect(calls[0][1].redirect).toBe("error");
    expect(calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect((await health((async () => new Response("<html>not Paperclip</html>")) as typeof fetch)).ok).toBe(false);
    expect((await health((async () => { throw new Error("offline"); }) as typeof fetch)).ok).toBe(false);
    expect((await health((async () => new Response('{"status":"error"}')) as typeof fetch)).ok).toBe(false);
  });
});


describe("setup preflight and CLI input", () => {
  test("rejects arbitrary command/argument before any action", async () => {
    expect(main(["start", ";touch /tmp/no"])).rejects.toThrow("Usage");
    expect(main(["shell"])).rejects.toThrow("Usage");
  });
  test("refuses an existing partial dependency tree without deleting files", () => {
    const p = paths(temp());
    put(join(p.install, "package.json"), JSON.parse(MANIFEST));
    put(join(p.install, "node_modules/keep.json"), { keep: true });
    expect(() => setup(p, "/node-not-executed")).toThrow();
    expect(existsSync(join(p.install, "node_modules/keep.json"))).toBe(true);
  });
  test("rejects adjacent dotenv DB overrides without modifying data", () => {
    const p = paths(temp()); initialize(p);
    writeFileSync(join(p.instance, ".env"), "DATABASE_URL=postgres://unrelated\n");
    expect(() => validateConfig(p)).toThrow("dotenv");
  });
  test("health rejects HTTP errors and oversized responses", async () => {
    expect((await health((async () => new Response("bad", { status: 503 })) as typeof fetch)).ok).toBe(false);
    expect((await health((async () => new Response("x".repeat(17000))) as typeof fetch)).ok).toBe(false);
  });
});


test("npm argv uses the selected Node and never enables install scripts", () => {
  const root = temp();
  const node = join(root, "bin/node");
  put(node, {});
  put(join(root, "lib/node_modules/npm/bin/npm-cli.js"), {});
  const plan = installPlan(paths(temp()), node);
  expect(plan.executable).toBe(node);
  expect(plan.argv).toContain("ci");
  expect(plan.argv).toContain("--ignore-scripts");
  expect(plan.shell).toBe(false);
});


test("setup preserves an existing matching temporary install and is repeatable", () => {
  if (process.platform !== "darwin" || process.arch !== "arm64") return;
  const p = paths(temp());
  put(join(p.install, "package.json"), JSON.parse(MANIFEST));
  writeFileSync(join(p.install, "package-lock.json"), readFileSync(join(SOURCE, "package-lock.json")));
  put(join(p.install, "node_modules/paperclipai/package.json"), { name: "paperclipai", version: VERSION });
  put(join(p.install, "node_modules/paperclipai/dist/index.js"), {});
  const pkg = join(p.install, "node_modules/@embedded-postgres/darwin-arm64");
  put(join(pkg, "package.json"), { name: "@embedded-postgres/darwin-arm64", version: "18.1.0-beta.16" });
  put(join(pkg, "native/lib/real.dylib"), {});
  put(join(pkg, "native/pg-symlinks.json"), [{ source: "native/lib/real.dylib", target: "native/lib/alias.dylib" }]);
  setup(p, "/node-never-executed");
  const config = readFileSync(p.config, "utf8");
  setup(p, "/node-never-executed");
  expect(readFileSync(p.config, "utf8")).toBe(config);
  expect(inspect(p, () => "/mock/node").ok).toBe(true);
  writeFileSync(join(p.install, "package-lock.json"), "{}");
  expect(() => setup(p, "/node-never-executed")).toThrow("overwrite");
  expect(readFileSync(join(p.install, "package-lock.json"), "utf8")).toBe("{}");
});

test("native manifest rejects duplicates, absolute paths, version drift and redirected sources", () => {
  const f = nativeFixture();
  const manifest = join(f.pkg, "native/pg-symlinks.json");
  const entry = { source: "native/lib/real.dylib", target: "native/lib/alias.dylib" };
  put(manifest, [entry, entry]);
  expect(() => nativeLinks(f.root, true)).toThrow("Duplicate");
  put(manifest, [{ ...entry, target: "/tmp/alias.dylib" }]);
  expect(() => nativeLinks(f.root, true)).toThrow();
  put(manifest, [entry]);
  rmSync(join(f.pkg, entry.source));
  symlinkSync(join(temp(), "outside"), join(f.pkg, entry.source));
  expect(() => nativeLinks(f.root, true)).toThrow("symlink");
  put(join(f.pkg, "package.json"), { name: "@embedded-postgres/darwin-arm64", version: "wrong" });
  expect(() => nativeLinks(f.root, true)).toThrow("18.1.0-beta.16");
});

test("health aborts stalled requests within the documented bound", async () => {
  const fake = ((_url: unknown, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
    options.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  })) as typeof fetch;
  const start = Date.now();
  expect((await health(fake)).ok).toBe(false);
  expect(Date.now() - start).toBeLessThan(3500);
});
