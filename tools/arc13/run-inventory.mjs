import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(toolDirectory, "scan-ui-inventory.py");
const scriptArguments = [script, ...process.argv.slice(2)];
const candidates = process.env.PYTHON
  ? [[process.env.PYTHON, scriptArguments]]
  : process.platform === "win32"
    ? [["py", ["-3", ...scriptArguments]], ["python", scriptArguments]]
    : [["python3", scriptArguments], ["python", scriptArguments]];

let lastError = null;
for (const [command, args] of candidates) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (!result.error) process.exit(result.status ?? 1);
  lastError = result.error;
  if (!["ENOENT", "EACCES", "EPERM"].includes(result.error.code)) break;
}

process.stderr.write(
  "Could not start Python. Set the PYTHON environment variable to a Python 3 executable. "
  + String(lastError?.message || ""),
);
process.exit(2);
