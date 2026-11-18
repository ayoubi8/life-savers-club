/** Reading whole folders from the computer, for the media library uploads (browser only). */

/** Spread on an <input type="file"> so it picks a folder (with its subfolders) instead of files. */
export const PICK_FOLDER = { webkitdirectory: "", directory: "" } as Record<string, string>;

/** Name of the folder picked with PICK_FOLDER ("Photos/2024/a.jpg" → "Photos"). */
export function pickedFolderName(files: File[]): string | null {
  const path = files.find((file) => file.webkitRelativePath)?.webkitRelativePath;
  return path ? path.split("/")[0] || null : null;
}

function readEntries(reader: FileSystemDirectoryReader) {
  return new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
}

async function collect(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
    out.push(file);
    return;
  }
  if (!entry.isDirectory) return;
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries returns at most ~100 entries per call: keep reading until it comes back empty.
  for (let batch = await readEntries(reader); batch.length; batch = await readEntries(reader)) {
    for (const child of batch) await collect(child, out);
  }
}

/** Every file dropped, including the contents of dropped folders and their subfolders. */
export async function droppedFiles(data: DataTransfer): Promise<File[]> {
  // Entries must be taken synchronously, before the first await, or the browser empties the list.
  const entries = [...data.items].map((item) => item.webkitGetAsEntry?.()).filter((entry): entry is FileSystemEntry => !!entry);
  if (!entries.length) return [...data.files];
  const out: File[] = [];
  for (const entry of entries) await collect(entry, out).catch(() => undefined);
  return out;
}
