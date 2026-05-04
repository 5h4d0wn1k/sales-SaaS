import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.join(__dirname, "..");
const cleanArtifactsScript = path.join(__dirname, "rotate-build-artifacts.mjs");
const nextCli = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

const maxAttempts = 3;

function rotateArtifacts() {
  const cleanResult = spawnSync(process.execPath, [cleanArtifactsScript], {
    cwd: appDirectory,
    env: process.env,
    stdio: "inherit",
  });

  if (cleanResult.status !== 0) {
    process.exit(cleanResult.status ?? 1);
  }
}

rotateArtifacts();

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const result = spawnSync(process.execPath, [nextCli, "build"], {
    cwd: appDirectory,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status === 0) {
    process.exit(0);
  }

  if (attempt >= maxAttempts) {
    process.exit(result.status ?? 1);
  }

  console.warn(
    `Retrying Next.js web build after a failed attempt (${attempt + 1}/${maxAttempts})...`,
  );
  rotateArtifacts();
}
