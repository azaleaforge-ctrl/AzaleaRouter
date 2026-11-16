export interface RedisConnectionOptions {
  host: string;
  port: number;
  maxRetriesPerRequest: null;
  username?: string;
  password?: string;
  db?: number;
  tls?: {
    rejectUnauthorized?: boolean;
    servername?: string;
  };
}

/**
 * Parse redis:// and rediss:// URLs without logging or exposing credentials.
 * BullMQ workers require maxRetriesPerRequest=null for blocking operations.
 */
export function parseRedisConnectionOptions(redisUrl: string): RedisConnectionOptions {
  const url = new URL(redisUrl);

  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("Unsupported Redis URL protocol.");
  }
  if (!url.hostname) {
    throw new Error("Redis URL hostname is required.");
  }
  if (url.hash || url.search) {
    throw new Error("Redis URL query strings and fragments are not supported.");
  }

  const options: RedisConnectionOptions = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    maxRetriesPerRequest: null,
  };

  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65_535) {
    throw new Error("Redis URL port is invalid.");
  }

  try {
    if (url.username) options.username = decodeURIComponent(url.username);
    if (url.password) options.password = decodeURIComponent(url.password);
  } catch {
    throw new Error("Redis URL credentials are malformed.");
  }

  const databasePath = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  if (databasePath) {
    if (!/^[0-9]+$/.test(databasePath)) {
      throw new Error("Redis URL database index is invalid.");
    }
    const database = Number(databasePath);
    if (!Number.isSafeInteger(database) || database < 0) {
      throw new Error("Redis URL database index is invalid.");
    }
    options.db = database;
  }

  if (url.protocol === "rediss:") options.tls = {};
  return options;
}
