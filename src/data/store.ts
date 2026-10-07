import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DashboardInput } from "@/domain/dashboard";

/**
 * The last valid upload lives on disk: `current.json` (what the screen reads) plus a copy of
 * every original file in `uploads/` for audit. Folder: DATA_DIR, or ./storage.
 */

export type StoredData = {
  fileName: string;
  /** ISO instant. */
  uploadedAt: string;
  warnings: string[];
  input: DashboardInput;
};

const dir = () => process.env.DATA_DIR ?? path.join(process.cwd(), "storage");
const currentFile = () => path.join(dir(), "current.json");

export async function loadCurrent(): Promise<StoredData | null> {
  try {
    return JSON.parse(await readFile(currentFile(), "utf8")) as StoredData;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function saveUpload(
  file: ArrayBuffer,
  data: StoredData,
): Promise<void> {
  const uploads = path.join(dir(), "uploads");
  await mkdir(uploads, { recursive: true });
  const stamp = data.uploadedAt.replace(/[-:]/g, "").replace(/\..*$/, "");
  const safe = data.fileName.replace(/[^\w.\- ]+/g, "_").slice(-120);
  await writeFile(path.join(uploads, `${stamp}-${safe}`), Buffer.from(file));
  // Write-then-rename: a reader never sees a half-written current.json.
  const tmp = `${currentFile()}.tmp`;
  await writeFile(tmp, JSON.stringify(data));
  await rename(tmp, currentFile());
}
