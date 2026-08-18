/**
 * Collect files from a browser drag-and-drop, preserving folder structure
 * via webkitRelativePath (same shape as <input webkitdirectory>).
 */

type FileSystemFileEntryLike = {
  isFile: true;
  isDirectory: false;
  name: string;
  file: (
    successCallback: (file: File) => void,
    errorCallback?: (err: DOMException) => void,
  ) => void;
};

type FileSystemDirectoryEntryLike = {
  isFile: false;
  isDirectory: true;
  name: string;
  createReader: () => {
    readEntries: (
      successCallback: (entries: FileSystemEntryLike[]) => void,
      errorCallback?: (err: DOMException) => void,
    ) => void;
  };
};

type FileSystemEntryLike = FileSystemFileEntryLike | FileSystemDirectoryEntryLike;

function getAsEntry(item: DataTransferItem): FileSystemEntryLike | null {
  const anyItem = item as DataTransferItem & {
    webkitGetAsEntry?: () => FileSystemEntryLike | null;
    getAsEntry?: () => FileSystemEntryLike | null;
  };
  return anyItem.webkitGetAsEntry?.() ?? anyItem.getAsEntry?.() ?? null;
}

function readFile(entry: FileSystemFileEntryLike): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

async function readAllDirectoryEntries(
  reader: ReturnType<FileSystemDirectoryEntryLike["createReader"]>,
): Promise<FileSystemEntryLike[]> {
  const all: FileSystemEntryLike[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntryLike[]>((resolve, reject) => {
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

async function traverseEntry(
  entry: FileSystemEntryLike,
  pathPrefix: string,
): Promise<File[]> {
  if (entry.isFile) {
    const file = await readFile(entry);
    const relative = pathPrefix ? `${pathPrefix}${entry.name}` : entry.name;
    return [withRelativePath(file, relative)];
  }

  const children = await readAllDirectoryEntries(entry.createReader());
  const nextPrefix = `${pathPrefix}${entry.name}/`;
  const out: File[] = [];
  for (const child of children) {
    out.push(...(await traverseEntry(child, nextPrefix)));
  }
  return out;
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
    .filter((e): e is FileSystemEntryLike => Boolean(e));
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
