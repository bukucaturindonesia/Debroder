import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.cwd();
const manifest = JSON.parse(await readFile(path.join(packageDir, "manifest.json"), "utf8"));

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function exists(filePath) {
  try { await stat(filePath); return true; } catch { return false; }
}

if (!(await exists(path.join(repoRoot, "package.json"))) || !(await exists(path.join(repoRoot, "app")))) {
  console.error("FAIL: Jalankan script ini dari root repository DEBRODER.");
  process.exit(1);
}

const targets = Object.keys(manifest.old_hashes);
const states = [];
for (const target of targets) {
  const targetPath = path.join(repoRoot, target);
  if (!(await exists(targetPath))) {
    console.error(`FAIL: File target tidak ditemukan: ${target}`);
    process.exit(1);
  }
  const currentHash = sha256(await readFile(targetPath));
  const oldHash = manifest.old_hashes[target];
  const newHash = manifest.new_hashes[target];
  if (currentHash !== oldHash && currentHash !== newHash) {
    console.error(`FAIL: Source lokal berbeda dari source Batch 4A yang diaudit: ${target}`);
    console.error("STOP: Jangan lanjut. Kirim git status -sb dan file source terbaru.");
    process.exit(1);
  }
  states.push({ target, currentHash, alreadyApplied: currentHash === newHash });
}

const pending = states.filter((item) => !item.alreadyApplied);
if (!pending.length) {
  console.log("PASS: PUBLIC EXPERIENCE BATCH 4A sudah terpasang.");
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(repoRoot, ".debroder-backups", `public-experience-batch4a-${stamp}`);

for (const item of pending) {
  const targetPath = path.join(repoRoot, item.target);
  const backupPath = path.join(backupRoot, item.target);
  const payloadPath = path.join(packageDir, "payload", item.target);
  await mkdir(path.dirname(backupPath), { recursive: true });
  await copyFile(targetPath, backupPath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await copyFile(payloadPath, targetPath);
  const installedHash = sha256(await readFile(targetPath));
  if (installedHash !== manifest.new_hashes[item.target]) {
    console.error(`FAIL: Verifikasi hasil copy gagal: ${item.target}`);
    process.exit(1);
  }
  console.log(`UPDATED: ${item.target}`);
}

console.log("");
console.log("PASS: PUBLIC EXPERIENCE BATCH 4A diterapkan.");
console.log("Scope: /kaos-polos + /jaket-hoodie + category discovery + product listing.");
console.log("Tidak ada perubahan database, admin, checkout, pricing, variant, SKU, atau stok.");
console.log(`Backup: ${path.relative(repoRoot, backupRoot)}`);
console.log("NEXT: pnpm.cmd build");
