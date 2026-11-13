type LogLevel = "info" | "warn" | "error";

export interface SafeWorkerLogFields {
  queueName?: string;
  jobName?: string;
  jobId?: string;
  signal?: string;
}

/** Structured logs accept only operational metadata, never job payloads or credentials. */
export function logWorkerEvent(
  level: LogLevel,
  event: string,
  fields: SafeWorkerLogFields = {},
): void {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
