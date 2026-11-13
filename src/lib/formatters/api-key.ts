export function maskApiKey(secret: string): string {
  return `${secret.slice(0, 12)}${"•".repeat(4)}`;
}

export function isMaskedApiKey(value: string): boolean {
  return value.endsWith("••••");
}
