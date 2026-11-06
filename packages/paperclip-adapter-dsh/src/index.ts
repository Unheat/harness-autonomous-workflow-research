import type { ServerAdapterModule } from "@paperclipai/adapter-utils";
import { configSchema, parseConfig, checkCommand } from "./config.js";
import { execute } from "./execute.js";
import { launch, type Launch } from "./process.js";
import { listSkills, syncSkills } from "./skills.js";
export { parseStdoutLine } from "./ui-parser.js";
export { configSchema } from "./config.js";
export { listSkills, syncSkills } from "./skills.js";
export function createServerAdapter(dependencies: {launch?: Launch} = {}): ServerAdapterModule {
  return {
    type:"dsh", supportsLocalAgentJwt:true, supportsInstructionsBundle:true, runtimeToolDelivery:"environment",
    instructionsPathKey:"instructionsFilePath", requiresMaterializedRuntimeSkills:true,
    getConfigSchema:()=>configSchema,
    execute:ctx=>execute(ctx,dependencies.launch ?? launch),
    listSkills, syncSkills,
    async testEnvironment(ctx) {
      try {
        if (ctx.executionTarget && ctx.executionTarget.kind !== "local") throw new Error("Local only");
        const config = parseConfig(ctx.config); checkCommand(config.command);
        return {adapterType:"dsh",status:"warn",testedAt:new Date().toISOString(),checks:[
          {code:"static_configuration",level:"info",message:"Directory and executable validated; no process was launched."},
          {code:"runtime_unverified",level:"warn",message:"Authentication, registered model, Paperclip integration and native desktop tools require operator testing."}
        ]};
      } catch {
        return {adapterType:"dsh",status:"fail",testedAt:new Date().toISOString(),checks:[{code:"invalid_configuration",level:"error",message:"Check local cwd, executable, route and timeouts. No provider was contacted."}]};
      }
    }
  };
}
export default createServerAdapter;
