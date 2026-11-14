import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export interface StoredPrivateObject {
  key: string;
  size: number;
}

export interface PrivateObjectStorage {
  put(bytes: Buffer): Promise<StoredPrivateObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

function assertStorageKey(key: string): void {
  if (!/^[0-9a-f-]{36}$/i.test(key)) throw new Error("STORAGE_KEY_INVALID");
}

export class LocalPrivateObjectStorage implements PrivateObjectStorage {
  private readonly root: string;

  constructor(rootDirectory: string) {
    if (!rootDirectory.trim()) throw new Error("PRIVATE_STORAGE_DIRECTORY_REQUIRED");
    this.root = path.resolve(rootDirectory);
  }

  private filePath(key: string): string {
    assertStorageKey(key);
    const file = path.resolve(this.root, key.slice(0, 2), key);
    if (!file.startsWith(this.root + path.sep)) throw new Error("STORAGE_PATH_INVALID");
    return file;
  }

  async put(bytes: Buffer): Promise<StoredPrivateObject> {
    const key = randomUUID();
    const file = this.filePath(key);
    const directory = path.dirname(file);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temp = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temp, bytes, { flag: "wx", mode: 0o600 });
      await rename(temp, file);
    } catch (error) {
      await rm(temp, { force: true }).catch(() => undefined);
      throw error;
    }
    return { key, size: bytes.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.filePath(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.filePath(key), { force: true });
  }
}
