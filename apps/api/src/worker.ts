import { configureDatabase } from "@sales/database";
import { createApp } from "./app";

type HyperdriveBinding = {
  connectionString: string;
};

type ApiWorkerEnv = {
  DATABASE_URL?: string;
  HYPERDRIVE?: HyperdriveBinding;
};

const app = createApp();

function resolveWorkerDatabaseUrl(env: ApiWorkerEnv) {
  return env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
}

export default {
  async fetch(request: Request, env: ApiWorkerEnv, executionContext: unknown) {
    configureDatabase({
      connectionString: resolveWorkerDatabaseUrl(env),
    });

    return app.fetch(request, env, executionContext as never);
  },
};
