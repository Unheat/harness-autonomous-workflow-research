import { spawnSync } from "node:child_process";
import { delimiter, dirname, isAbsolute, join } from "node:path";
import { DISCOVERY_TIMEOUT_MS, HOST, PORT, type Paths } from "./constants";

export function supportedNode(version: string) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  return !!m && (+m[1] > 24 || (+m[1] === 24 && +m[2] >= 11));
}
export function discoverNode(env: NodeJS.ProcessEnv = process.env,
  probe = (path: string) => {
    const result = spawnSync(path, ["--version"], { encoding: "utf8", timeout: DISCOVERY_TIMEOUT_MS,
      shell: false, env: { PATH: env.PATH, HOME: env.HOME } });
    return result.status === 0 ? result.stdout.trim() : "";
  }) {
  const candidates = env.WORKBENCH_NODE ? [env.WORKBENCH_NODE] : [
    "/opt/homebrew/bin/node", "/usr/local/bin/node", ...((env.PATH ?? "").split(delimiter)
      .filter(isAbsolute).map(p => join(p, "node")))];
  for (const candidate of new Set(candidates)) {
    if (!isAbsolute(candidate)) throw new Error("WORKBENCH_NODE must be an absolute executable path");
    if (supportedNode(probe(candidate))) return candidate;
  }
  throw new Error("Node >=24.11.0 required; set WORKBENCH_NODE=/absolute/path/to/node (default Node 20 is unsupported)");
}

// Allowlist avoids leaking DB URLs, auth tokens, NODE_OPTIONS, or harness configuration.
export function environment(p: Paths, node: string, source: NodeJS.ProcessEnv = process.env) {
  const env: NodeJS.ProcessEnv = {};
  for (const key of ["HOME", "USER", "LOGNAME", "TMPDIR", "LANG", "TERM", "COLORTERM"]) {
    if (source[key] !== undefined) env[key] = source[key];
  }
  Object.assign(env, { PATH: [dirname(node), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"].join(delimiter),
    PAPERCLIP_HOME: p.state, PAPERCLIP_INSTANCE_ID: "default", PAPERCLIP_CONFIG: p.config,
    PAPERCLIP_TELEMETRY_DISABLED: "1", DO_NOT_TRACK: "1", HOST, PORT: String(PORT),
    NPM_CONFIG_USERCONFIG: join(p.workbench, "npmrc"), NPM_CONFIG_GLOBALCONFIG: join(p.workbench, "npmrc-global"),
    NPM_CONFIG_CACHE: join(p.workbench, "npm-cache"), NPM_CONFIG_IGNORE_SCRIPTS: "true",
    NPM_CONFIG_AUDIT: "false", NPM_CONFIG_FUND: "false", NPM_CONFIG_UPDATE_NOTIFIER: "false" });
  return env;
}
export function command(p: Paths, node: string, args: string[]) {
  return { executable: node, argv: [join(p.install, "node_modules/paperclipai/dist/index.js"), ...args,
    "--data-dir", p.state, "--config", p.config], shell: false as const, cwd: p.install,
    env: environment(p, node) };
}
export function run(c: ReturnType<typeof command>) {
  const result = spawnSync(c.executable, c.argv, { cwd: c.cwd, env: c.env, shell: c.shell, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Child exited ${result.status ?? result.signal}`);
}
