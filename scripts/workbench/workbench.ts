import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { isAbsolute, join } from "node:path";
import { BASE_URL, contained, DB_PORT, HEALTH_TIMEOUT_MS, HOST, MAX_HEALTH_BYTES, PORT, VERSION, type Paths } from "./constants";
import { discoverNode } from "./runtime";
import { nativeLinks } from "./native";

export function safePaths(p: Paths) {
  for (const path of [p.workbench, p.install, p.state, p.instance, p.config, ...["npmrc", "npmrc-global", "npm-cache"].map(name => join(p.workbench, name)), join(p.install, ".npmrc")]) contained(p.root, path);
}
export function validateConfig(p: Paths) {
  safePaths(p);
  const c = JSON.parse(readFileSync(p.config, "utf8"));
  if (c.server?.host !== HOST || c.server?.bind !== "loopback" || c.server?.port !== PORT ||
      c.server?.deploymentMode !== "local_trusted" || c.server?.exposure !== "private" ||
      !Array.isArray(c.server?.allowedHostnames) || c.server.allowedHostnames.length ||
      c.database?.mode !== "embedded-postgres" || c.storage?.provider !== "local_disk" ||
      c.secrets?.provider !== "local_encrypted") throw new Error("Unsafe config: require private loopback :3100 and local storage/database/secrets");
  for (const path of [c.database.embeddedPostgresDataDir, c.database.backup?.dir,
    c.logging?.logDir, c.storage.localDisk?.baseDir, c.secrets.localEncrypted?.keyFilePath]) {
    if (typeof path !== "string" || !isAbsolute(path)) throw new Error("Missing local data path in config");
    contained(p.instance, path);
  }
  // Paperclip loads dotenv independently. Do not let an adjacent file undo isolation.
  for (const dir of [p.install, p.state, p.instance]) {
    const file = contained(p.root, join(dir, ".env"));
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith("#")) continue;
      if (!/^\s*(?:export\s+)?(PAPERCLIP_AGENT_JWT_SECRET|PAPERCLIP_TOOL_ACTION_SIGNING_SECRET|BETTER_AUTH_SECRET)\s*=/.test(line)) {
        throw new Error(`Unsupported dotenv override in ${file}; review manually (no changes made)`);
      }
    }
  }
  return c;
}
export function initialize(p: Paths) {
  safePaths(p);
  if (existsSync(p.config)) { validateConfig(p); return; }
  mkdirSync(p.instance, { recursive: true, mode: 0o700 });
  const c = {
    $meta: { version: 1, updatedAt: new Date().toISOString(), source: "configure" },
    database: { mode: "embedded-postgres", embeddedPostgresDataDir: join(p.instance, "db"), embeddedPostgresPort: DB_PORT,
      backup: { enabled: true, intervalMinutes: 60, retentionDays: 30, dir: join(p.instance, "data/backups") } },
    logging: { mode: "file", logDir: join(p.instance, "logs") },
    server: { deploymentMode: "local_trusted", exposure: "private", bind: "loopback", host: HOST, port: PORT,
      allowedHostnames: [], serveUi: true },
    telemetry: { enabled: false }, updates: { checkEnabled: false },
    auth: { baseUrlMode: "auto", disableSignUp: false },
    storage: { provider: "local_disk", localDisk: { baseDir: join(p.instance, "data/storage") },
      s3: { bucket: "paperclip", region: "us-east-1", prefix: "", forcePathStyle: false } },
    secrets: { provider: "local_encrypted", strictMode: false, localEncrypted: { keyFilePath: join(p.instance, "secrets/master.key") } },
  };
  const key = contained(p.root, join(p.instance, "secrets/master.key"));
  const envFile = contained(p.root, join(p.instance, ".env"));
  mkdirSync(join(p.instance, "secrets"), { recursive: true, mode: 0o700 });
  if (!existsSync(key)) writeFileSync(key, randomBytes(32).toString("base64"), { flag: "wx", mode: 0o600 });
  if (!existsSync(envFile)) writeFileSync(envFile,
    `PAPERCLIP_AGENT_JWT_SECRET=${randomBytes(32).toString("hex")}\nPAPERCLIP_TOOL_ACTION_SIGNING_SECRET=${randomBytes(32).toString("hex")}\n`,
    { flag: "wx", mode: 0o600 });
  writeFileSync(p.config, JSON.stringify(c, null, 2) + "\n", { flag: "wx", mode: 0o600 });
}
export function installed(p: Paths) {
  safePaths(p);
  const meta = JSON.parse(readFileSync(contained(p.root, join(p.install, "node_modules/paperclipai/package.json")), "utf8"));
  if (meta.name !== "paperclipai" || meta.version !== VERSION) throw new Error(`Expected paperclipai@${VERSION}`);
  if (!existsSync(contained(p.root, join(p.install, "node_modules/paperclipai/dist/index.js")))) throw new Error("Paperclip CLI entry missing");
}
export function inspect(p: Paths, discover = discoverNode) {
  const checks: { name: string; ok: boolean; detail: string }[] = [];
  const check = (name: string, fn: () => unknown) => {
    try { const result = fn(); checks.push({ name, ok: true, detail: String(result ?? "ok") }); }
    catch (error) { checks.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) }); }
  };
  check("node >=24.11.0", () => discover());
  check(`paperclipai@${VERSION}`, () => installed(p));
  check("isolated loopback config", () => {
    const c = validateConfig(p);
    return c.telemetry?.enabled === false ? "telemetry disabled in config and wrapper" : "existing config retained; wrapper disables telemetry via environment";
  });
  check("native links (Darwin ARM64)", () => {
    safePaths(p);
    const missing = nativeLinks(p.install, false);
    if (missing) throw new Error(`${missing} missing native links; run setup to hydrate`);
  });
  return { ok: checks.every(c => c.ok), checks };
}
export async function health(fetcher: typeof fetch = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetcher(`${BASE_URL}/api/health`, { signal: controller.signal, redirect: "error" });
    if (!response.ok || !response.body) throw new Error(`Health HTTP ${response.status}`);
    const reader = response.body.getReader();
    let text = "";
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        if (text.length > MAX_HEALTH_BYTES) throw new Error("Oversized health response");
      }
    } finally { await reader.cancel(); }
    const body = JSON.parse(text);
    if (body.status !== "ok") throw new Error("Endpoint did not report Paperclip health status ok");
    return { ok: true, url: BASE_URL, detail: "Health endpoint reachable; this alone does not establish process ownership" };
  } catch (error) {
    return { ok: false, url: BASE_URL, detail: error instanceof Error ? error.message : String(error) };
  } finally { clearTimeout(timer); }
}
