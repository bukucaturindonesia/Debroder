import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.cwd();
const manifest = JSON.parse(await readFile(path.join(packageDir, "manifest.json"), "utf8"));

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(path.join(repoRoot, "package.json"))) || !(await exists(path.join(repoRoot, "app")))) {
  console.error("FAIL: Jalankan script dari root repository DEBRODER.");
  process.exit(1);
}

const targetPath = path.join(repoRoot, manifest.target);
const payloadPath = path.join(packageDir, "payload", manifest.target);

if (!(await exists(targetPath)) || !(await exists(payloadPath))) {
  console.error(`FAIL: File tidak ditemukan: ${manifest.target}`);
  process.exit(1);
}

const currentHash = sha256(await readFile(targetPath));
if (currentHash === manifest.new_hash) {
  console.log("PASS: Batch 4A compatibility hotfix sudah terpasang.");
  process.exit(0);
}

if (!manifest.accepted_hashes.includes(currentHash)) {
  console.error(`FAIL: Source lokal berbeda dari Batch 4A yang diaudit: ${manifest.target}`);
  console.error("STOP: Jangan ubah manual. Kirim git status -sb.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(repoRoot, ".debroder-backups", `batch4a-compat-${stamp}`);
const backupPath = path.join(backupRoot, manifest.target);

await mkdir(path.dirname(backupPath), { recursive: true });
await copyFile(targetPath, backupPath);
await copyFile(payloadPath, targetPath);

const installedHash = sha256(await readFile(targetPath));
if (installedHash !== manifest.new_hash) {
  await copyFile(backupPath, targetPath);
  console.error("FAIL: Verifikasi file gagal. Source dipulihkan.");
  process.exit(1);
}

const diffCheck = spawnSync("git", ["diff", "--check", "--", manifest.target], {
  cwd: repoRoot,
  encoding: "utf8",
  shell: false
});

if (diffCheck.status !== 0) {
  await copyFile(backupPath, targetPath);
  console.error(diffCheck.stdout || diffCheck.stderr);
  console.error(`STOP: git diff --check gagal. Source dipulihkan. Backup: ${backupRoot}`);
  process.exit(1);
}

console.log("PASS: Batch 4A compatibility hotfix diterapkan.");
console.log("FIX: Kontrak CategoryCommercePage tetap kompatibel dengan /headwear.");
console.log("Tidak mengubah test, database, pricing, cart, checkout, admin, atau halaman Jersey.");
console.log(`Backup: ${path.relative(repoRoot, backupRoot)}`);
console.log("NEXT: pnpm.cmd build");
