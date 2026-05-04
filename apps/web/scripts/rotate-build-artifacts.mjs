import { existsSync, readdirSync, renameSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";

const artifactDirectories = [".next"];
const stalePrefixes = artifactDirectories.map((directory) => `${directory}.stale-`);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeDirectoryWithRetry(targetPath) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      await rm(targetPath, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (!["ENOTEMPTY", "EBUSY", "EPERM", "ENOENT"].includes(code) || attempt === 8) {
        throw error;
      }

      await sleep(attempt * 150);
    }
  }
}

async function pruneStaleArtifacts(cwd) {
  for (const entry of readdirSync(cwd, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const isStaleArtifact = stalePrefixes.some((prefix) => entry.name.startsWith(prefix));
    if (!isStaleArtifact) {
      continue;
    }

    try {
      await removeDirectoryWithRetry(path.join(cwd, entry.name));
    } catch (error) {
      console.warn(`Failed to remove stale artifact directory "${entry.name}".`, error);
    }
  }
}

async function rotateArtifactDirectory(cwd, directory) {
  const currentPath = path.join(cwd, directory);

  if (!existsSync(currentPath)) {
    return;
  }

  const rotatedPath = path.join(cwd, `${directory}.stale-${Date.now()}-${process.pid}`);
  renameSync(currentPath, rotatedPath);

  try {
    await removeDirectoryWithRetry(rotatedPath);
  } catch (error) {
    console.warn(`Deferred cleanup for "${path.basename(rotatedPath)}".`, error);
  }
}

const cwd = process.cwd();
await pruneStaleArtifacts(cwd);

for (const directory of artifactDirectories) {
  await rotateArtifactDirectory(cwd, directory);
}
