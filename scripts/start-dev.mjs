import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const env = {};

for (const [key, value] of Object.entries(process.env)) {
  if (key.toLowerCase() !== "path" && value !== undefined) {
    env[key] = value;
  }
}

const nodeDir = path.dirname(process.execPath);
env.Path = `${nodeDir};${process.env.Path ?? process.env.PATH ?? ""}`;

const out = fs.openSync(path.join(root, "dev-server.log"), "a");
const err = fs.openSync(path.join(root, "dev-server.err.log"), "a");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [
  nextBin,
  "dev",
  "--hostname",
  "127.0.0.1",
  "--port",
  "3000"
], {
  cwd: root,
  detached: true,
  env,
  stdio: ["ignore", out, err],
  windowsHide: true
});

child.unref();
console.log(child.pid);
