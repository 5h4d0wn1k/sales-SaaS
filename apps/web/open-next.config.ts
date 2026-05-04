import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();

if (process.env.OPEN_NEXT_BUILD_OUTPUT_PATH) {
  config.buildOutputPath = process.env.OPEN_NEXT_BUILD_OUTPUT_PATH;
}

export default config;
