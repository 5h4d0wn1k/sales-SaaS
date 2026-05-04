import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

const FALLBACK_DATABASE_URL =
  "postgres://sales_saas:sales_saas@localhost:5434/sales_aaas";

type HyperdriveBinding = {
  connectionString?: string;
};

type CloudflareRequestContext = {
  env?: {
    HYPERDRIVE?: HyperdriveBinding;
  };
};

function resolveBoundHyperdriveConnectionString() {
  const contextSymbol = Symbol.for("__cloudflare-context__");
  const context = (globalThis as Record<PropertyKey, unknown>)[
    contextSymbol
  ] as CloudflareRequestContext | undefined;

  return context?.env?.HYPERDRIVE?.connectionString;
}

function resolveConnectionString() {
  return (
    resolveBoundHyperdriveConnectionString() ??
    process.env.DATABASE_URL ??
    FALLBACK_DATABASE_URL
  );
}

function buildPoolConfig(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");

  if (sslMode === "disable") {
    return {
      connectionString,
      ssl: false,
    };
  }

  if (sslMode === "no-verify") {
    return {
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }

  if (sslMode) {
    return {
      connectionString,
      ssl: true,
    };
  }

  return { connectionString };
}

function createDatabaseRuntime(connectionString: string) {
  const runtimePool = new Pool(buildPoolConfig(connectionString));

  return {
    connectionString,
    pool: runtimePool,
    db: drizzle(runtimePool, { schema }),
  };
}

type DatabaseRuntime = ReturnType<typeof createDatabaseRuntime>;

declare global {
  // eslint-disable-next-line no-var
  var __salesDatabaseRuntime__: DatabaseRuntime | undefined;
}

function getRuntimeState() {
  if (!globalThis.__salesDatabaseRuntime__) {
    globalThis.__salesDatabaseRuntime__ = createDatabaseRuntime(resolveConnectionString());
  }

  return globalThis.__salesDatabaseRuntime__;
}

const runtime = getRuntimeState();

export let pool = runtime.pool;
export let db = runtime.db;

export function configureDatabase(options: { connectionString?: string } = {}) {
  const current = getRuntimeState();
  const nextConnectionString = options.connectionString ?? resolveConnectionString();

  if (current.connectionString === nextConnectionString) {
    return current.db;
  }

  void current.pool.end().catch((error) => {
    console.error("Failed to close PostgreSQL pool during reconfiguration.", error);
  });

  globalThis.__salesDatabaseRuntime__ = createDatabaseRuntime(nextConnectionString);
  pool = globalThis.__salesDatabaseRuntime__.pool;
  db = globalThis.__salesDatabaseRuntime__.db;

  return db;
}

export function getDatabaseConnectionString() {
  return getRuntimeState().connectionString;
}

export function getPool() {
  return getRuntimeState().pool;
}
