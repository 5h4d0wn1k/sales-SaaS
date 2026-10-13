import webPackage from "../package.json";

export type ReleaseMetadata = {
  version: string;
  commitSha: string | null;
  deploymentId: string | null;
};

function firstConfiguredEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

export function buildWebReleaseMetadata(): ReleaseMetadata {
  return {
    version: webPackage.version,
    commitSha: firstConfiguredEnv([
      "RELEASE_COMMIT_SHA",
      "GITHUB_SHA",
      "CF_PAGES_COMMIT_SHA",
      "VERCEL_GIT_COMMIT_SHA",
      "COMMIT_SHA",
    ]),
    deploymentId: firstConfiguredEnv([
      "RELEASE_DEPLOYMENT_ID",
      "DEPLOYMENT_ID",
      "VERCEL_DEPLOYMENT_ID",
      "CF_VERSION_METADATA_ID",
      "CF_PAGES_DEPLOYMENT_ID",
    ]),
  };
}
