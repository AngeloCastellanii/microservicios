import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: run-with-env.ts <command> [...args]");
  process.exit(1);
}

const [command, ...rest] = args;
const localBin = path.join(process.cwd(), "node_modules", ".bin");
const child = spawn(command!, rest, {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    PATH: `${localBin}${path.delimiter}${process.env.PATH ?? ""}`,
  },
  cwd: process.cwd(),
});

child.on("exit", (code) => process.exit(code ?? 1));
