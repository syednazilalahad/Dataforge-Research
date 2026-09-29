import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
export interface ObjectStorage {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
// Private storage only. A future S3 adapter implements the same port with short-lived signed access.
// Callers must authorize project ownership before invoking any storage operation.
export class LocalObjectStorage implements ObjectStorage {
  constructor(private root = path.resolve('.data/objects')) {}
  private file(key: string) {
    if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid object key.');
    const resolved = path.resolve(this.root, key);
    if (!resolved.startsWith(path.resolve(this.root) + path.sep)) throw new Error('Invalid object path.');
    return resolved;
  }
  async put(key: string, data: Buffer) {
    const file = this.file(key);
    await mkdir(path.dirname(file), {
      recursive: true
    });
    await writeFile(file, data, {
      flag: 'wx'
    });
  }
  async get(key: string) {
    return readFile(this.file(key));
  }
  async remove(key: string) {
    await unlink(this.file(key));
  }
}
