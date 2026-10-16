import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(__dirname, "../../..");
const smokeScript = path.join(repoRoot, "scripts/cloudflare-smoke.sh");

let tempDir: string;

async function createFakeCurlBin() {
  tempDir = await mkdtemp(path.join(tmpdir(), "sales-smoke-test-"));
  const binDir = path.join(tempDir, "bin");
  await mkdir(binDir);
  const curlPath = path.join(binDir, "curl");
  await writeFile(
    curlPath,
    `#!/usr/bin/env bash
set -euo pipefail
url="\${@: -1}"
case "$url" in
  *api.example.test/health)
    printf '%s' '{"status":"ok","service":"sales-api","release":{"version":"0.1.0"}}'
    ;;
  *api.example.test/ready)
    printf '%s' "$API_READY_RESPONSE"
    ;;
  *web.example.test/health)
    printf '%s' '{"status":"ok","service":"sales-web","release":{"version":"0.1.0"}}'
    ;;
  *web.example.test/ready)
    printf '%s' "$WEB_READY_RESPONSE"
    ;;
  *web.example.test/sitemap.xml)
    printf '%s' "\${WEB_SITEMAP_RESPONSE:-'<urlset><url><loc>https://web.example.test/pricing</loc></url><url><loc>https://web.example.test/trust</loc></url><url><loc>https://web.example.test/ai-sdr-software</loc></url><url><loc>https://web.example.test/compare-sales-tools</loc></url></urlset>'}"
    ;;
  *web.example.test/robots.txt)
    printf '%s' "\${WEB_ROBOTS_RESPONSE:-'User-agent: *
Disallow: /api/
Sitemap: https://web.example.test/sitemap.xml'}"
    ;;
  *web.example.test/.well-known/security.txt)
    printf '%s' "\${WEB_SECURITY_RESPONSE:-'Contact: mailto:hello@salesxgrowth.com
Expires: 2026-12-31T00:00:00.000Z
Canonical: https://web.example.test/.well-known/security.txt
Policy: https://salesxgrowth.com/trust
Preferred-Languages: en'}"
    ;;
  *web.example.test/opengraph-image)
    printf '%s' "\${WEB_OPENGRAPH_HEADERS:-'HTTP/2 200
Content-Type: image/png'}"
    ;;
  *web.example.test/twitter-image)
    printf '%s' "\${WEB_TWITTER_HEADERS:-'HTTP/2 200
Content-Type: image/png'}"
    ;;
  *web.example.test)
    exit 0
    ;;
  *)
    echo "unexpected curl url: $url" >&2
    exit 22
    ;;
esac
`,
    { mode: 0o755 },
  );
  return binDir;
}

function readyPayload(service: string, warnings: string[] = []) {
  return JSON.stringify({
    status: "ready",
    service,
    release: {
      version: "0.1.0",
    },
    warnings,
  });
}

async function runSmoke(options: {
  apiReadyResponse: string;
  webReadyResponse?: string;
  allowWarnings?: boolean;
  webSitemapResponse?: string;
  webRobotsResponse?: string;
  webSecurityResponse?: string;
  webOpenGraphHeaders?: string;
  webTwitterHeaders?: string;
}) {
  const binDir = await createFakeCurlBin();

  return execFileAsync("bash", [smokeScript], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
      WEB_APP_URL: "https://web.example.test",
      API_HEALTHCHECK_URL: "https://api.example.test/health",
      API_READY_RESPONSE: options.apiReadyResponse,
      WEB_READY_RESPONSE: options.webReadyResponse ?? readyPayload("sales-web"),
      WEB_SITEMAP_RESPONSE: options.webSitemapResponse ?? "",
      WEB_ROBOTS_RESPONSE: options.webRobotsResponse ?? "",
      WEB_SECURITY_RESPONSE: options.webSecurityResponse ?? "",
      WEB_OPENGRAPH_HEADERS: options.webOpenGraphHeaders ?? "",
      WEB_TWITTER_HEADERS: options.webTwitterHeaders ?? "",
      READINESS_ALLOW_WARNINGS: options.allowWarnings ? "true" : "false",
    },
  });
}

beforeEach(() => {
  tempDir = "";
});

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("Cloudflare production smoke script", () => {
  it("fails readiness when warning-level blockers are present", async () => {
    await expect(
      runSmoke({
        apiReadyResponse: readyPayload("sales-api", [
          "No production email sender is configured.",
        ]),
      }),
    ).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringContaining("API readiness has 1 warning(s)"),
    });
  });

  it("allows readiness warnings only through an explicit rollout exception", async () => {
    await expect(
      runSmoke({
        apiReadyResponse: readyPayload("sales-api", [
          "No production email sender is configured.",
        ]),
        allowWarnings: true,
      }),
    ).resolves.toMatchObject({
      stdout: expect.stringContaining("Smoke check: web security metadata"),
    });
  });

  it("fails web readiness when downstream API warnings are exposed through the web payload", async () => {
    await expect(
      runSmoke({
        apiReadyResponse: readyPayload("sales-api"),
        webReadyResponse: JSON.stringify({
          status: "ready",
          service: "sales-web",
          release: {
            version: "0.1.0",
          },
          checks: {
            api: {
              warnings: 2,
            },
          },
        }),
      }),
    ).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringContaining("Web readiness has 2 warning(s)"),
    });
  });

  it("does not double-count web readiness warnings once top-level warnings are present", async () => {
    await expect(
      runSmoke({
        apiReadyResponse: readyPayload("sales-api"),
        webReadyResponse: JSON.stringify({
          status: "ready",
          service: "sales-web",
          release: {
            version: "0.1.0",
          },
          warnings: ["API: No production email sender is configured."],
          checks: {
            api: {
              warnings: 1,
            },
          },
        }),
      }),
    ).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringContaining("Web readiness has 1 warning(s)"),
    });
  });

  it("checks public SEO and trust assets after readiness passes", async () => {
    await expect(
      runSmoke({
        apiReadyResponse: readyPayload("sales-api"),
      }),
    ).resolves.toMatchObject({
      stdout: expect.stringContaining("Smoke check: web Twitter image"),
    });
  });

  it("fails when the public sitemap is missing a revenue-critical route", async () => {
    await expect(
      runSmoke({
        apiReadyResponse: readyPayload("sales-api"),
        webSitemapResponse:
          "<urlset><url><loc>https://web.example.test/pricing</loc></url></urlset>",
      }),
    ).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringContaining("Web sitemap did not contain /trust"),
    });
  });

  it("fails when security metadata overclaims a vulnerability program", async () => {
    await expect(
      runSmoke({
        apiReadyResponse: readyPayload("sales-api"),
        webSecurityResponse:
          "Contact: mailto:hello@salesxgrowth.com\nPolicy: https://salesxgrowth.com/trust\nSafe Harbor: yes",
      }),
    ).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringContaining("Web security.txt contained forbidden text: safe harbor"),
    });
  });

  it("fails when social preview images stop serving PNG content", async () => {
    await expect(
      runSmoke({
        apiReadyResponse: readyPayload("sales-api"),
        webOpenGraphHeaders: "HTTP/2 200\nContent-Type: text/html",
      }),
    ).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringContaining(
        "Web Open Graph image did not contain header content-type: image/png",
      ),
    });
  });
});
