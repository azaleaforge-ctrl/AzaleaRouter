type LogLevel = "info" | "warn" | "error";

export interface SafeLogFields {
  requestId?: string;
  statusCode?: number;
  code?: string;
  signal?: string;
  host?: string;
  port?: number;
  environment?: string;
  method?: string;
  durationMs?: number;
}

function write(level: LogLevel, event: string, fields: SafeLogFields = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  const line = JSON.stringify(entry);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/**
 * Structured JSON logging with an explicit allowlist of fields.
 * Request bodies, URLs, headers, cookies, credentials, tokens, provider payloads,
 * prompts and arbitrary error messages are deliberately not accepted.
 */
export const logger = Object.freeze({
  info: (event: string, fields?: SafeLogFields) => write("info", event, fields),
  warn: (event: string, fields?: SafeLogFields) => write("warn", event, fields),
  error: (event: string, fields?: SafeLogFields) => write("error", event, fields),
});
