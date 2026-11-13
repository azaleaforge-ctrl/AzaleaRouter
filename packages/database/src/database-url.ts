const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

export function validateDatabaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }

  if (!POSTGRES_PROTOCOLS.has(parsed.protocol)) {
    throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
  }

  if (!parsed.hostname || !parsed.pathname || parsed.pathname === "/") {
    throw new Error("DATABASE_URL must include a database host and database name.");
  }

  if (!parsed.username || !parsed.password) {
    throw new Error("DATABASE_URL must include database credentials.");
  }

  return value;
}
