export type FileScanVerdict = "clean" | "malicious" | "unknown";

export interface FileScanResult {
  verdict: FileScanVerdict;
  engine: string;
  detailCode?: string;
}

export interface FileScanner {
  scan(input: { bytes: Buffer; mimeType: string; sha256: string }): Promise<FileScanResult>;
}

/**
 * Safe default when no antivirus service has been approved/configured.
 * Unknown verdicts must remain quarantined and must never be downloaded or
 * passed to a model/provider.
 */
export class UnavailableFileScanner implements FileScanner {
  async scan(): Promise<FileScanResult> {
    return { verdict: "unknown", engine: "unconfigured", detailCode: "SCANNER_NOT_CONFIGURED" };
  }
}
