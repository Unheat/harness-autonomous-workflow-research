import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { contained, SOURCE, VERSION, type Paths } from "./constants";
import { environment } from "./runtime";
import { initialize, installed, safePaths, validateConfig } from "./workbench";
import { nativeLinks } from "./native";

export const MANIFEST = JSON.stringify({ dependencies: { paperclipai: VERSION } }, null, 2) + "\n";
export function installPlan(p: Paths, node: string) {
  const bin = dirname(realpathSync(node));
  const npm = [join(bin, "node_modules/npm/bin/npm-cli.js"), join(bin, "../lib/node_modules/npm/bin/npm-cli.js")]
    .find(path => existsSync(path));
  if (!npm) throw new Error(`npm CLI not found beside selected Node: ${npm}`);
  return { executable: node, argv: [npm, "ci", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", p.install],
    cwd: p.install, env: environment(p, node), shell: false as const };
}
function ensureFile(path: string, content: string, equivalent = (a: string, b: string) => a === b) {
  if (existsSync(path)) {
    if (!equivalent(readFileSync(path, "utf8"), content)) throw new Error(`Refusing to overwrite nonmatching file: ${path}`);
  } else writeFileSync(path, content, { flag: "wx", mode: 0o600 });
}
export function setup(p: Paths, node: string) {
  if (process.platform !== "darwin" || process.arch !== "arm64") throw new Error("Reviewed native setup currently supports macOS ARM64 only");
  safePaths(p);
  if (existsSync(p.config)) validateConfig(p);
  const lock = readFileSync(join(SOURCE, "package-lock.json"), "utf8");
  const meta = JSON.parse(lock);
  if (meta.packages["node_modules/paperclipai"].version !== VERSION) throw new Error("Bundled lock pin mismatch");
  for (const name of ["package.json", "package-lock.json", "node_modules", ".env"]) contained(p.root, join(p.install, name));
  const populated = existsSync(join(p.install, "node_modules"));
  // npm ci deletes node_modules: never run it against an existing tree, even a partial install.
  if (populated) installed(p);
  mkdirSync(p.install, { recursive: true });
  ensureFile(join(p.install, "package.json"), MANIFEST, (a, b) => JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b)));
  ensureFile(join(p.install, "package-lock.json"), lock);
  if (!populated) {
    const c = installPlan(p, node);
    const result = spawnSync(c.executable, c.argv, { cwd: c.cwd, env: c.env, shell: c.shell, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("npm ci failed; inspect partial install manually before retrying (nothing auto-deleted)");
  }
  installed(p);
  nativeLinks(p.install, true);
  initialize(p);
  console.log(`Ready: paperclipai@${VERSION}. No service started; existing config retained.`);
}
