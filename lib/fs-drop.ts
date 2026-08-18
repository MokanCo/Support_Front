/**
 * Collect files from a browser drag-and-drop, preserving folder structure
 * via webkitRelativePath (same shape as <input webkitdirectory>).
 */

/** Loose shape — DOM FileSystemEntry uses boolean, not literal true/false. */
type FsEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (
    successCallback: (file: File) => void,
    errorCallback?: (err: DOMException) => void,
  ) => void;
  createReader?: () => {
    readEntries: (
      successCallback: (entries: FsEntry[]) => void,
      errorCallback?: (err: DOMException) => void,
    ) => void;
  };
};

function getAsEntry(item: DataTransferItem): FsEntry | null {
  const anyItem = item as DataTransferItem & {
    webkitGetAsEntry?: () => unknown;
    getAsEntry?: () => unknown;
  };
  const raw = anyItem.webkitGetAsEntry?.() ?? anyItem.getAsEntry?.() ?? null;
  if (!raw || typeof raw !== "object") return null;
  return raw as FsEntry;
}

function readFile(entry: FsEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!entry.file) {
      reject(new Error("Not a file entry"));
      return;
    }
    entry.file(resolve, reject);
  });
}

type DirectoryReader = {
  readEntries: (
    successCallback: (entries: FsEntry[]) => void,
    errorCallback?: (err: DOMException) => void,
  ) => void;
};

async function readAllDirectoryEntries(reader: DirectoryReader): Promise<FsEntry[]> {
  const all: FsEntry[] = [];
  for (;;) {
    const batch = await new Promise<FsEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (!batch.length) break;
    all.push(...batch);
  }
  return all;
}

function withRelativePath(file: File, relativePath: string): File {
  try {
    Object.defineProperty(file, "webkitRelativePath", {
      value: relativePath,
      configurable: true,
    });
  } catch {
    /* ignore — upload still works without structure */
  }
  return file;
}

async function traverseEntry(entry: FsEntry, pathPrefix: string): Promise<File[]> {
  if (entry.isFile) {
    const file = await readFile(entry);
    const relative = pathPrefix ? `${pathPrefix}${entry.name}` : entry.name;
    return [withRelativePath(file, relative)];
  }

  if (entry.isDirectory && entry.createReader) {
    const children = await readAllDirectoryEntries(entry.createReader());
    const nextPrefix = `${pathPrefix}${entry.name}/`;
    const out: File[] = [];
    for (const child of children) {
      out.push(...(await traverseEntry(child, nextPrefix)));
    }
    return out;
  }

  return [];
}

/** True when the drag payload includes filesystem files/folders. */
export function dataTransferHasFiles(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  return Array.from(dt.types).includes("Files");
}

/**
 * Read dropped files/folders. Prefer directory entries so nested structure
 * is preserved; fall back to FileList when entries API is unavailable.
 *
 * Important: entries + FileList must be read synchronously in the drop
 * handler before any await, or browsers clear the DataTransfer.
 */
export async function collectFilesFromDataTransfer(
  dt: DataTransfer,
): Promise<File[]> {
  const items = dt.items ? Array.from(dt.items) : [];
  const entries = items
    .filter((i) => i.kind === "file")
    .map((i) => getAsEntry(i))
    .filter((e): e is FsEntry => Boolean(e));
  const flatFallback = Array.from(dt.files ?? []);

  if (entries.length > 0) {
    const files: File[] = [];
    for (const entry of entries) {
      files.push(...(await traverseEntry(entry, "")));
    }
    if (files.length > 0) return files;
  }

  return flatFallback;
}

export function dropLooksLikeFolder(files: File[]): boolean {
  return files.some((f) => {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || "";
    return rel.includes("/");
  });
}
