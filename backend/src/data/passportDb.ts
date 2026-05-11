import sql, { type ConnectionPool, type IResult } from "mssql";

let poolPromise: Promise<ConnectionPool> | null = null;

/** Lazily-initialised connection pool. We open one pool per process and
 *  reuse it across requests — `mssql` handles per-call connection checkout. */
function getPool(): Promise<ConnectionPool> {
  if (poolPromise) return poolPromise;

  const config: sql.config = {
    server: process.env.PASSPORT_DB_HOST ?? "localhost",
    port: Number(process.env.PASSPORT_DB_PORT ?? 1433),
    database: process.env.PASSPORT_DB_NAME ?? "passport",
    user: process.env.PASSPORT_DB_USER,
    password: process.env.PASSPORT_DB_PASSWORD,
    options: {
      encrypt: process.env.PASSPORT_DB_ENCRYPT === "true",
      trustServerCertificate: process.env.PASSPORT_DB_TRUST_SERVER_CERT !== "false"
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 }
  };

  poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
      pool.on("error", (err) => {
        // Log but do not crash the process — next call will trigger a reconnect.
        console.error("[passport-db] pool error:", err);
        poolPromise = null;
      });
      return pool;
    })
    .catch((err) => {
      poolPromise = null; // allow retry on next call
      throw err;
    });

  return poolPromise;
}

/** Run a parameterised query against Passport. Pass parameters as an object;
 *  they are bound by name (`@id`, `@firmId`, etc.) — never string-concatenate
 *  user input into SQL. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: Record<string, string | number | boolean | Date | null> = {}
): Promise<IResult<T>> {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  return request.query<T>(text);
}

/** Test connectivity. Used by /api/health and on first boot. */
export async function ping(): Promise<boolean> {
  try {
    const result = await query<{ ok: number }>("SELECT 1 AS ok");
    return result.recordset[0]?.ok === 1;
  } catch (err) {
    console.error("[passport-db] ping failed:", err);
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (!poolPromise) return;
  const pool = await poolPromise;
  await pool.close();
  poolPromise = null;
}
